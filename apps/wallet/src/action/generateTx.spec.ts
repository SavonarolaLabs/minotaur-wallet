import { describe, expect, it } from 'vitest';
import { generateTx } from './generateTx';

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

    const { tx, boxes } = await generateTx(wallet, addresses, receivers, fee);

    expect(tx).toBeDefined();
    expect(tx.id()).toEqual('dummy_tx_id_prefix_0');
    expect(boxes).toHaveLength(1);
  });
});
