import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { track } from '@/analytics';
import { CoinFly } from '@/components/effects/CoinFly';
import { CoinCounter } from '@/components/hud/CoinCounter';
import { StarryBackground } from '@/components/StarryBackground';
import { useMetaStore } from '@/state/metaStore';

const RC_APPLE_KEY = 'appl_GrAwncMkfMBVnHPdKduNzwMNnyz';

/** ASC consumable product id → coins granted */
const COIN_PACKS: Record<string, number> = {
  'potionsort.coins.400': 400,
  'potionsort.coins.1200': 1200,
  'potionsort.coins.3000': 3000,
};

let configured = false;
function ensureConfigured() {
  // ponytail: IAP products belong to the production bundle id in ASC — the .dev
  // variant can never fetch them, so skip RevenueCat entirely outside release
  // builds instead of logging guaranteed config errors. Test purchases on TestFlight.
  if (__DEV__) return false;
  if (configured) return true;
  Purchases.configure({ apiKey: RC_APPLE_KEY });
  configured = true;
  return true;
}

// ponytail: coins granted client-side in the purchase callback; if the app dies
// mid-callback the grant is lost — upgrade path is RevenueCat webhooks + server,
// not worth it at this scale.
export default function ShopScreen() {
  const router = useRouter();
  const addCoins = useMetaStore((s) => s.addCoins);
  const pendingCoinReward = useMetaStore((s) => s.pendingCoinReward);
  const clearCoinCelebration = useMetaStore((s) => s.clearCoinCelebration);
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!ensureConfigured()) {
      setPackages([]);
      return;
    }
    Purchases.getOfferings()
      .then((offerings) => setPackages(offerings.current?.availablePackages ?? []))
      .catch(() => setPackages([]));
  }, []);

  const buy = async (pkg: PurchasesPackage) => {
    if (buying) return;
    setBuying(true);
    try {
      await Purchases.purchasePackage(pkg);
      const coins = COIN_PACKS[pkg.product.identifier] ?? 0;
      if (coins > 0) {
        addCoins(coins);
        track('iap_purchase', { pack: pkg.product.identifier });
      }
    } catch (e: unknown) {
      if (!(e as { userCancelled?: boolean }).userCancelled) {
        Alert.alert('Purchase failed', 'Nothing was charged. Please try again.');
      }
    } finally {
      setBuying(false);
    }
  };

  return (
    <View style={styles.container}>
      <StarryBackground />
      <SafeAreaView style={styles.content}>
        <View style={styles.topBar}>
          <CoinCounter />
          <Pressable onPress={() => router.back()} style={styles.close} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Coin Shop</Text>
        {packages === null && <Text style={styles.note}>Loading…</Text>}
        {packages !== null && packages.length === 0 && (
          <Text style={styles.note}>The shop is being stocked — check back soon!</Text>
        )}
        <View style={styles.packs}>
          {packages?.map((pkg) => (
            <Pressable key={pkg.identifier} style={styles.pack} disabled={buying} onPress={() => buy(pkg)}>
              <View style={styles.coin} />
              <Text style={styles.packCoins}>{COIN_PACKS[pkg.product.identifier] ?? '?'} coins</Text>
              <Text style={styles.packPrice}>{pkg.product.priceString}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
      {pendingCoinReward !== null && <CoinFly onDone={clearCoinCelebration} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0E2A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  close: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#E8E6FF',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#E8E6FF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  note: {
    color: 'rgba(232,230,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 24,
  },
  packs: {
    gap: 14,
    marginTop: 12,
  },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  coin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F2D43D',
    borderWidth: 2,
    borderColor: '#C9A227',
  },
  packCoins: {
    color: '#E8E6FF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  packPrice: {
    color: '#FFE9A8',
    fontSize: 16,
    fontWeight: '800',
  },
});
