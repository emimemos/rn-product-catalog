import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
};

export type CatalogStackParamList = {
  ProductList: undefined;
  ProductDetail: {productId: string};
};

export type ProfileStackParamList = {
  Profile: undefined;
  PerformanceLab: undefined;
};

export type AppTabParamList = {
  CatalogTab: NavigatorScreenParams<CatalogStackParamList>;
  FavoritesTab: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};

export type ProductListScreenProps = NativeStackScreenProps<
  CatalogStackParamList,
  'ProductList'
>;
export type ProductDetailScreenProps = NativeStackScreenProps<
  CatalogStackParamList,
  'ProductDetail'
>;
export type FavoritesScreenProps = BottomTabScreenProps<
  AppTabParamList,
  'FavoritesTab'
>;
export type ProfileScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  'Profile'
>;

/**
 * Registering the root ParamList globally makes `navigation.navigate()` and
 * `useNavigation()` type-safe throughout the app without importing types in
 * every file. The cost is that there can only be one root ParamList per app.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
