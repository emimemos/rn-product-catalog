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
 * Registrar el ParamList raíz a nivel global hace que `navigation.navigate()`
 * y `useNavigation()` sean type-safe en toda la app sin importar tipos en cada
 * archivo. El costo es que solo puede haber un ParamList raíz por app.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
