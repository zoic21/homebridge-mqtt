import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SecuritySystemAccessory } from './securitySystemAccessory';

import * as mqtt from "mqtt";

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class MqttHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public Devices = {};
  public ConfigDevices;
  public MqttClient;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.ConfigDevices = [{
      id: 'ajaxhub',
      name: 'Ajax',
      type: 'SecuritySystem',
      config: {
        state : {
          STAY_ARM : 'ARM',
          AWAY_ARM : 'AWAY',
          NIGHT_ARM : 'NIGHT',
          DISARM : 'DIRSARM',
          ALARM_TRIGGERED : 'TRIGGER'
        },
        currentState : {
            get : 'ajax'
        },
        targetState : {
            set : 'ajax'
        }
      }
    }];

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    this.MqttClient = mqtt.connect(this.config.mqtt.ip, {
      clientId: "mqtt-homebridge"+Math.random().toString(16).substr(2, 8),
      rejectUnauthorized: false,
      username: this.config.mqtt.username,
      password: this.config.mqtt.password,
      reconnectPeriod: 1000
    })

    this.MqttClient.on("message", (topic, message) => {
      this.handleMqttData(topic, message);
    });
    
    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of this.ConfigDevices) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(device.id);
      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);
        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        this.Devices[uuid] = this.getAccessoryFromDevice(device,existingAccessory);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.name);
        // create a new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);
        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;
        this.Devices[uuid] = this.getAccessoryFromDevice(device,accessory);
        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
 
  getAccessoryFromDevice(device,accessory){
    switch (device.type) {
      case 'SecuritySystem':
        return new SecuritySystemAccessory(this, accessory);
        break;
    }
  }

  handleMqttData(topic,data){
    for (const device of this.ConfigDevices) {
      if(!this.Devices[this.api.hap.uuid.generate(device.id)]){
        continue;
      }
      switch (device.type) {
        case 'SecuritySystem':
        if(topic == device.config.currentState.get){
          this.Devices[this.api.hap.uuid.generate(device.id)].handleMqttData(topic,data)
        }
        break;
      }
    } 
  }


}