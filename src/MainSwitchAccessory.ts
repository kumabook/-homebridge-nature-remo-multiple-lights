import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { NatureRemoMultifunctionLightHomebridgePlatform } from './platform';

export default class MainSwitchAccessory {
  private service: Service;

  constructor(
    private readonly platform: NatureRemoMultifunctionLightHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const Characteristic = platform.Characteristic;

    this.service = this.accessory.getService(platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    this.service.getCharacteristic(Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));
  }

  async handleOnGet(): Promise<CharacteristicValue> {
    console.log(`[MainSwitch][Get] on: ${this.current()} ${this.platform.state.lightingPoint}`)
    return this.current()
  }

  async handleOnSet(value: CharacteristicValue) {
    try {
      console.log(`[MainSwitch][Set] on: ${value}`)
      await this.platform.handleMainOnSet(value)
    } catch (e) {
      console.error(`[MainSwitch][Set] on: ${value}. ${e}`)
    }
  }

  current(): boolean {
    if (!this.platform.state.on) {
      return false
    }
    switch (this.platform.state.lightingPoint) {
      case 'both':
        return true
      case 'main':
        return true
      default:
        return false
    }
  }

  update() {
    console.log(`[MainSwitch][Update] on: ${this.current()}`)
    this.service.updateCharacteristic(
      this.platform.Characteristic.On,
      this.current()
    );
  }
}
