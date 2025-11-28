import { useCallback, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import {
  decryptPrivateKeyPem,
  importPrivateKey
} from '../lib/crypto';

export function usePrivateKey() {
  const {
    encryptedPrivateKey,
    unlockedPrivateKey,
    setUnlockedPrivateKey
  } = useAuthContext();
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const unlock = useCallback(
    async (password: string) => {
      if (!encryptedPrivateKey) {
        throw new Error('No encrypted private key available');
      }
      setUnlocking(true);
      setUnlockError(null);
      try {
        const pem = await decryptPrivateKeyPem(
          encryptedPrivateKey.encryptedPrivateKey,
          encryptedPrivateKey.privateKeySalt,
          encryptedPrivateKey.privateKeyIv,
          password
        );
        const key = await importPrivateKey(pem);
        setUnlockedPrivateKey(key);
      } catch (err) {
        setUnlockError((err as Error).message || 'Failed to unlock key');
        throw err;
      } finally {
        setUnlocking(false);
      }
    },
    [encryptedPrivateKey, setUnlockedPrivateKey]
  );

  const lock = useCallback(() => setUnlockedPrivateKey(null), [setUnlockedPrivateKey]);

  return {
    unlockedPrivateKey,
    unlock,
    lock,
    unlocking,
    unlockError,
    hasEncryptedKey: Boolean(encryptedPrivateKey)
  };
}


