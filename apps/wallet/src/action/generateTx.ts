import { StateWallet } from '@/store/reducer/wallet';
import { ReceiverTokenType, ReceiverType } from '@/types/sign-modal';
import * as wasm from 'ergo-lib-wasm-browser';

const mapReceiversToOutputCandidates = (
  height: number,
  // 1456180
  receivers: Array<ReceiverType>,
  // [{
  //   address: '3WwbzW6u8hKWBcL1W7kNVMr25s2UHfSBnYtwSHvrRQt7DdPuoXrt',
  //   amount: 10_000_000n,
  //   tokens: [],
  // }]
): wasm.ErgoBoxCandidate[] =>
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
): wasm.ErgoBoxCandidate | undefined => {
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

function wrapInBoxSelection(inputs: wasm.ErgoBox[]): wasm.BoxSelection {
  const inputBoxes: wasm.ErgoBoxes = wasm.ErgoBoxes.empty();
  inputs.forEach((item) => inputBoxes.add(item));
  const boxSelection = new wasm.BoxSelection(
    inputBoxes,
    new wasm.ErgoBoxAssetsDataList(),
  );
  return boxSelection;
}

function wrapInErgoBoxCandidates(
  outputs: (wasm.ErgoBoxCandidate | undefined)[],
): wasm.ErgoBoxCandidates {
  const outputCandidates: wasm.ErgoBoxCandidates =
    wasm.ErgoBoxCandidates.empty();

  outputs
    .filter((x) => x != undefined)
    .forEach((box) => outputCandidates.add(box));
  return outputCandidates;
}

export async function generateTx(
  wallet: StateWallet,
  addresses: Array<number>,
  receivers: Array<ReceiverType>,
  // {
  //   address: '3WwbzW6u8hKWBcL1W7kNVMr25s2UHfSBnYtwSHvrRQt7DdPuoXrt',
  //   amount: 10_000_000n,
  //   tokens: [],
  // }
  fee: bigint,
  selectedBoxes: wasm.ErgoBox[],
  height: number,
  // 1456180
) {
  // candidates =
  // [{
  //   value: '10000000',
  //   ergoTree:
  //     '0008cd028333f9f7454f8d5ff73dbac9833767ed6fc3a86cf0a73df946b32ea9927d9197',
  //   assets: [],
  //   additionalRegisters: {},
  //   creationHeight: 1456180,
  // }]
  const candidates: wasm.ErgoBoxCandidate[] = mapReceiversToOutputCandidates(
    height,
    receivers,
  );

  // changeBox =
  // {
  //   value: '988900000',
  //   ergoTree:
  //     '0008cd0374be4846b83e90442a273bd9a37fb7d8dadb5612ca6c2b28c8233563cff46206',
  //   assets: [],
  //   additionalRegisters: {},
  //   creationHeight: 1456180,
  // }
  const changeBox: wasm.ErgoBoxCandidate | undefined = generateChangeBox(
    selectedBoxes,
    candidates,
    fee,
    wallet.addresses.filter((item) => addresses.includes(item.id))[0].address,
    height,
  );

  const outputCandidates: wasm.ErgoBoxCandidates = wrapInErgoBoxCandidates([
    ...candidates,
    changeBox,
  ]);

  // Transaction
  const tx = wasm.TxBuilder.new(
    wrapInBoxSelection(selectedBoxes), // 1
    outputCandidates, // 2 Boxes out
    height,
    wasm.BoxValue.from_i64(wasm.I64.from_str(fee.toString())), // +1 Box out
    wasm.Address.from_base58(wallet.addresses[0].address),
  )
    .build()
    .to_js_eip12();

  return { tx, boxes: selectedBoxes };
}
