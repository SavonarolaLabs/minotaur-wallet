import { describe, expect, it } from 'vitest';
import { generateTx } from './generateTx';
import { ErgoBox, ErgoBoxes } from 'ergo-lib-wasm-browser';

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
      xPub: 'xpub6DtxfjV48KyRDBbttgzcrjeWzF8dv9queWafNwbUvsD6kRWDRVk5HBVvkQTpMBFCCGDWMNnmaB1RK8fNnkLwcuRBpVr2yFrzz9ZcF6nsM9w',
      requiredSign: 1,
      seed: 'U2FsdGVkX19vmnopjRn/kzFO9+MkybpgdV4p0NRHQfQqofgN66XyCpUxFlzvSq0DuNLcXE79nasyHA70A4RT9e3PVW8oK4RaFA5Au9mDkX3IlZRPS7iidk/z5RrO18OgG28htV2b5ZaXuVW9B5rkzQeU4zFr0XCFAJWZAfdvsCQP072Tz7OiF5SHNQjJASHQ4w1Md8w6IN3MPwMMvbFM5Q==',
      version: 1,
    };

    const addresses = [1];
    const receivers = [
      {
        address: '3WwbzW6u8hKWBcL1W7kNVMr25s2UHfSBnYtwSHvrRQt7DdPuoXrt',
        amount: 10_000_000n,
        tokens: [],
      },
    ];
    const fee = 1100000n;

    const userBoxes = [
      JSON.parse(
        '{\n  "boxId": "a2376567a4627f4d6c6ce84723439a4b40236bb8cf4ac73cfae859e1481b42ac",\n  "value": 1000000000,\n  "ergoTree": "0008cd0374be4846b83e90442a273bd9a37fb7d8dadb5612ca6c2b28c8233563cff46206",\n  "assets": [],\n  "additionalRegisters": {},\n  "creationHeight": 1451306,\n  "transactionId": "63c4bc030fdaffacb9309e0f1df1e6951c329f6c8fec73cc1e73e665f314eb50",\n  "index": 0\n}',
      ),
    ];

    const wasmBoxes: ErgoBox[] = [ErgoBoxes.from_boxes_json(userBoxes).get(0)];
    const { tx, boxes } = await generateTx(
      wallet,
      addresses,
      receivers,
      fee,
      wasmBoxes,
    );

    expect(tx).toBeDefined();
    expect(boxes).toHaveLength(1);
  });
});
