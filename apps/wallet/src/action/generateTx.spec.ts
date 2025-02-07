import { describe, expect, it } from 'vitest';
import { generateTx } from './generateTx';
import { ErgoBoxes } from 'ergo-lib-wasm-browser';

describe('generateTx', () => {
  it('should generate a transaction with valid inputs', async () => {
    const wallet = {
      id: 1,
      name: 'RustTest',
      networkType: 'Main Net',
      type: 'NORMAL',
      balance: '1000000000',
      tokens: [],
      addresses: [
        {
          address: '9hMDjzgnrwET8dweNnK3wKHJf7Vi3zWcKsFEEcdETdSie34BQ16',
          walletId: 1,
          balance: '1000000000',
          name: 'Main Address',
          tokens: [],
          idx: 0,
          path: "m/44'/429'/0'/0/0",
          proceedHeight: 1451335,
          id: 1,
        },
      ],
      xPub: 'xpub...',
      requiredSign: 1,
      seed: 'mock_seed',
      version: 1,
    };

    const addresses = [1];
    const receivers = [
      {
        address: '9hMDjzgnrwET8dweNnK3wKHJf7Vi3zWcKsFEEcdETdSie34BQ16',
        amount: 100000000n,
        tokens: [],
      },
    ];
    const fee = 1100000n;

    const userBoxes = [
      {
        boxId:
          '562628e27d081f9c72437616d04e4657008f33655528f901b001f630c223502b',
        value: 147,
        ergoTree:
          '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
        creationHeight: 9149,
        assets: [
          {
            tokenId:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            amount: 1000,
          },
        ],
        additionalRegisters: {
          R4: '100204a00b08cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041ea02d192a39a8cc7a70173007301',
        },
        transactionId:
          '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
        index: 0,
        address: '3WwbzW6u8hKWBcL1W7kNVMr25s2UHfSBnYtwSHvrRQt7DdPuoXrt',
        spentTransactionId:
          '3ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
        spendingHeight: 147,
        inclusionHeight: 147,
        globalIndex: 83927,
      },
    ];

    const wasmBoxes = ErgoBoxes.from_boxes_json(userBoxes);
    const { tx, boxes } = await generateTx(
      wallet,
      addresses,
      receivers,
      fee,
      wasmBoxes,
    );

    expect(tx).toBeDefined();
    expect(tx.id()).toEqual('dummy_tx_id_prefix_0');
    expect(boxes).toHaveLength(1);
  });
});
