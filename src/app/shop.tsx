import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { track } from '@/analytics';
import { CoinFly } from '@/components/effects/CoinFly';
import { CoinCounter } from '@/components/hud/CoinCounter';
import { StarryBackground } from '@/components/StarryBackground';
import { IconButton } from '@/components/ui/IconButton';
import { useMetaStore } from '@/state/metaStore';
import { color, font, radius, shadow } from '@/theme';

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
      .then((offerings) => {
        const packs = offerings.current?.availablePackages ?? [];
        // smallest pack first, regardless of dashboard order
        packs.sort((a, b) => (COIN_PACKS[a.product.identifier] ?? 0) - (COIN_PACKS[b.product.identifier] ?? 0));
        setPackages(packs);
      })
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
          <IconButton glyph="✕" onPress={() => router.back()} />
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
  title: {
    color: color.goldText,
    fontFamily: font.bold,
    fontSize: 30,
    textAlign: 'center',
    marginVertical: 20,
  },
  note: {
    color: color.textDim,
    fontFamily: font.medium,
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
    backgroundColor: color.panelLight,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.panelBorder,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...shadow.chip,
  },
  coin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.gold,
    borderWidth: 2.5,
    borderColor: color.goldRimBottom,
  },
  packCoins: {
    color: color.text,
    fontFamily: font.semibold,
    fontSize: 18,
    flex: 1,
  },
  packPrice: {
    color: color.panelDeep,
    fontFamily: font.bold,
    fontSize: 15,
    backgroundColor: color.gold,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.goldRimBottom,
    paddingHorizontal: 14,
    paddingVertical: 5,
    overflow: 'hidden',
  },
});
