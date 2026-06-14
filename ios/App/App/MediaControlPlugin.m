#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(MediaControlPlugin, "MediaControl",
    CAP_PLUGIN_METHOD(getSystemVolume, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setSystemVolume, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(sendMediaCommand, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(openNotificationSettings, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isNotificationListenerEnabled, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startDiscovery, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopDiscovery, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getDiscoveredDevices, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(bondDevice, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(connectA2dp, CAPPluginReturnPromise);
)
