// MapView platform-specific resolver
import type { ComponentType } from 'react';
import { Platform } from 'react-native';

type AnyProps = Record<string, unknown>;
type MapComponent = ComponentType<AnyProps>;

type MapViewModule = {
  default: MapComponent;
  Marker: MapComponent;
  Callout: MapComponent;
  PROVIDER_GOOGLE: string;
};

function loadMapViewModule(): MapViewModule {
  if (Platform.OS === 'web') {
    return require('./MapView.web') as unknown as MapViewModule;
  }

  return require('./MapView.native') as unknown as MapViewModule;
}

const mapViewModule = loadMapViewModule();

const MapViewComponent = mapViewModule.default;
const Marker = mapViewModule.Marker;
const Callout = mapViewModule.Callout;
const PROVIDER_GOOGLE = mapViewModule.PROVIDER_GOOGLE;

export default MapViewComponent;
export { Marker, Callout, PROVIDER_GOOGLE };
