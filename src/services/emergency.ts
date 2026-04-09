import { Alert, Linking } from 'react-native';
import { Config } from '../constants/config';
import { Strings } from '../constants/strings';

export function triggerEmergencyCall() {
  Alert.alert(
    Strings.emergencyConfirm,
    Strings.emergencyConfirmBody,
    [
      { text: Strings.cancel, style: 'cancel' },
      {
        text: Strings.call,
        style: 'destructive',
        onPress: () => {
          Linking.openURL(`tel:${Config.emergencyNumber}`);
        },
      },
    ],
  );
}
