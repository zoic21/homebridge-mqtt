import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { MqttAjaxHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SecuritySystemAccessory {
  private service: Service;

  constructor(
    private readonly platform: MqttHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Ajax')
      .setCharacteristic(this.platform.Characteristic.Model, 'hub')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'homebridge-mqtt-ajax');
    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.SecuritySystem) || this.accessory.addService(this.platform.Service.SecuritySystem);
    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    // each service must implement at-minimum the "required characteristics" for the given service type
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState).onSet(this.handleSecuritySystemTargetStateSet.bind(this))

    this.platform.MqttClient.subscribe((accessory.context.device.currentState.get, (err) => {}));
  }

  handleSecuritySystemTargetStateSet(value) {
    this.platform.log.debug('Triggered SET SecuritySystemTargetState, publish at :'+accessory.context.device.config.targetState.set + ' to ' + value);
    this.platform.MqttClient.publish(accessory.context.device.config.targetState.set, value);
  }

  handleMqttData(topic,data){
    switch (topic) {
      case accessory.context.device.config.currentState.get:
        this.platform.log.debug('Update current state to :'+ data);
        break;
    }
  }

}
