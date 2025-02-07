import * as wasm from 'ergo-lib-wasm-browser';
import { ReceiverTokenType, ReceiverType } from '@/types/sign-modal';
import { BoxDbAction } from './db';
import { StateWallet } from '@/store/reducer/wallet';
import { deserialize } from './box';

const generateCandidates = (height: number, receivers: Array<ReceiverType>) =>
  receivers.map((receiver) => {
    const builder = new wasm.ErgoBoxCandidateBuilder(
      wasm.BoxValue.from_i64(wasm.I64.from_str(receiver.amount.toString())),
      wasm.Contract.pay_to_address(wasm.Address.from_base58(receiver.address)),
      height,
    );
    receiver.tokens.forEach((token) => {
      if (token.amount > 0) {
        builder.add_token(
          wasm.TokenId.from_str(token.id),
          wasm.TokenAmount.from_i64(wasm.I64.from_str(token.amount.toString())),
        );
      }
    });
    if (receiver.registers) {
      Object.entries(receiver.registers).forEach(([key, value]) => {
        builder.set_register_value(parseInt(key), value);
      });
    }
    return builder.build();
  });

const generateChangeBox = (
  inputs: Array<wasm.ErgoBox>,
  outputs: Array<wasm.ErgoBoxCandidate>,
  fee: bigint,
  address: string,
  height: number,
) => {
  let total = inputs
    .map((item) => BigInt(item.value().as_i64().to_str()))
    .reduce((a, b) => a + b, 0n);
  total -= outputs
    .map((item) => BigInt(item.value().as_i64().to_str()))
    .reduce((a, b) => a + b, 0n);
  total -= fee;
  const tokens = receiverTokensToDict(
    inputs
      .map((input) => getBoxTokens(input))
      .reduce((a, b) => [...a, ...b], []),
  );
  outputs.forEach((output) => {
    getBoxTokens(output).forEach((token) => {
      if (Object.keys(tokens).indexOf(token.id) !== -1) {
        tokens[token.id] -= token.amount;
        if (tokens[token.id] <= 0n) {
          delete tokens[token.id];
        }
      }
    });
  });
  if (total === 0n && Object.keys(tokens).length === 0) return undefined;
  const builder = new wasm.ErgoBoxCandidateBuilder(
    wasm.BoxValue.from_i64(wasm.I64.from_str(total.toString())),
    wasm.Contract.pay_to_address(wasm.Address.from_base58(address)),
    height,
  );
  Object.entries(tokens).forEach(([tokenId, amount]) => {
    builder.add_token(
      wasm.TokenId.from_str(tokenId),
      wasm.TokenAmount.from_i64(wasm.I64.from_str(amount.toString())),
    );
  });
  return builder.build();
};

const receiverTokensToDict = (tokens: Array<ReceiverTokenType>) => {
  const res: { [tokenId: string]: bigint } = {};
  tokens.forEach((token) => {
    if (Object.keys(res).indexOf(token.id) === -1) {
      res[token.id] = token.amount;
    } else {
      res[token.id] += token.amount;
    }
  });
  return res;
};

const getBoxTokens = (
  box: wasm.ErgoBox | wasm.ErgoBoxCandidate,
): Array<ReceiverTokenType> => {
  const res: Array<ReceiverTokenType> = [];
  const tokens = box.tokens();
  for (let index = 0; index < tokens.len(); index++) {
    const token = tokens.get(index);
    const tokenId = token.id().to_str();
    const amount = BigInt(token.amount().as_i64().to_str());
    res.push({ id: tokenId, amount });
  }
  return res;
};

const selectBoxes = async (
  amount: bigint,
  tokens: Array<ReceiverTokenType>,
  addresses: Array<number>,
) => {
  const minBoxValue = -BigInt(wasm.BoxValue.SAFE_USER_MIN().as_i64().to_str());
  const requiredTokens = receiverTokensToDict(tokens);
  const result: Array<wasm.ErgoBox> = [];
  const selectBox = (box: wasm.ErgoBox) => {
    result.push(box);
    getBoxTokens(box).forEach((token) => {
      if (Object.keys(requiredTokens).indexOf(token.id) !== -1) {
        requiredTokens[token.id] -= token.amount;
        if (requiredTokens[token.id] <= 0n) {
          delete requiredTokens[token.id];
        }
      }
    });
    amount -= BigInt(box.value().as_i64().to_str());
  };
  for (const boxEntity of await BoxDbAction.getInstance().getAddressBoxes(
    addresses,
  )) {
    if (boxEntity.spend_tx_id !== null) continue;
    const box = deserialize(boxEntity.serialized);
    if (amount > 0 || (amount < 0 && amount > minBoxValue)) {
      selectBox(box);
    } else {
      const boxTokens = getBoxTokens(box);
      for (const token of boxTokens) {
        if (Object.keys(requiredTokens).indexOf(token.id) !== -1) {
          selectBox(box);
        }
      }
    }
    if (
      (amount === 0n || amount < minBoxValue) &&
      Object.keys(requiredTokens).length === 0
    ) {
      break;
    }
  }
  const coveringMsg: Array<string> = [];
  Object.entries(requiredTokens).forEach(([tokenId, amount]) => {
    coveringMsg.push(`${tokenId.substring(0, 6)}... : ${amount.toString()}`);
  });
  return {
    boxes: result,
    covered: amount <= 0n && Object.keys(requiredTokens).length === 0,
    covering: coveringMsg,
  };
};

export async function generateTx(
  wallet: StateWallet,
  addresses: Array<number>,
  receivers: Array<ReceiverType>,
  fee: bigint,
) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  //console.log("## input wallet - " + JSON.stringify(wallet));
  //console.log("## input addresses - " + JSON.stringify(addresses));
  //console.log("## input receivers - " + JSON.stringify(receivers));
  //console.log("## input fee - " + fee);

  const boxes = await selectBoxes(
    receivers.map((item) => item.amount).reduce((a, b) => a + b, fee),
    receivers.map((item) => item.tokens).reduce((a, b) => [...a, ...b], []),
    addresses,
  );
  if (!boxes.covered) {
    // TODO must display required send-amount
    throw Error('Not enough erg or tokens: ' + boxes.covering.join(', '));
  }
  const selectedBoxes = boxes.boxes;
  const height = 1456180;
  const candidates = generateCandidates(height, receivers);
  const changeBox = generateChangeBox(
    selectedBoxes,
    candidates,
    fee,
    wallet.addresses.filter((item) => addresses.includes(item.id))[0].address,
    height,
  );
  const inputBoxes = wasm.ErgoBoxes.empty();
  selectedBoxes.forEach((item) => inputBoxes.add(item));
  const boxSelection = new wasm.BoxSelection(
    inputBoxes,
    new wasm.ErgoBoxAssetsDataList(),
  );
  const candidateBoxes = wasm.ErgoBoxCandidates.empty();
  candidates.forEach((box) => candidateBoxes.add(box));
  if (changeBox) candidateBoxes.add(changeBox);

  for (let index = 0; index < boxSelection.boxes().len(); index++) {
    const box = boxSelection.boxes().get(index);
    //console.log(`## interim boxSelection [${index}] - ${JSON.stringify(box.to_json())}`);
  }
  for (let index = 0; index < candidateBoxes.len(); index++) {
    const candidate = candidateBoxes.get(index);
    //console.log(`## interim candidateBoxes [${index}] - ${candidate.value().as_i64().as_num()}`);
  }
  //console.log("## interim height - " + JSON.stringify(height));

  const tx = wasm.TxBuilder.new(
    boxSelection,
    candidateBoxes,
    height,
    wasm.BoxValue.from_i64(wasm.I64.from_str(fee.toString())),
    wasm.Address.from_base58(wallet.addresses[0].address),
  ).build();
  // const reduced = wasm.ReducedTransaction.from_unsigned_tx(tx, inputBoxes, wasm.ErgoBoxes.empty(), await network.getContext())

  //console.log("## return tx - " + JSON.stringify(tx.to_json()));
  //console.log("## return selectedBoxes - " + JSON.stringify(selectedBoxes.map((item) => item.to_json())));

  return { tx, boxes: selectedBoxes };
}
