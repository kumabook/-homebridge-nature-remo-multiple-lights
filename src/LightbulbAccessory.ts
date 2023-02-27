import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { NatureRemoMultifunctionLightHomebridgePlatform } from './platform';

export default class LightbulbPlatformAccessory {
  private service: Service;

  constructor(
    private readonly platform: NatureRemoMultifunctionLightHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const Characteristic = platform.Characteristic;

    this.service = this.accessory.getService(platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.getCharacteristic(Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));
    this.service.getCharacteristic(Characteristic.Brightness)
      .onSet(this.handleBrightnessGet.bind(this))
      .onSet(this.handleBrightnessSet.bind(this));
    this.service.getCharacteristic(Characteristic.ColorTemperature)
      .onSet(this.handleColorTemperatureGet.bind(this))
      .onSet(this.handleColorTemperatureSet.bind(this));
  }

  async handleOnGet(): Promise<CharacteristicValue> {
    this.platform.log.info(`[Lightbulb][Get] on: ${this.platform.state.on}`);
    return this.platform.state.on;
  }

  async handleOnSet(value: CharacteristicValue) {
    try {
      this.platform.log.info(`[Lightbulb][Set] on: ${value}`);
      await this.platform.handleLightbulbOnSet(value);
    } catch (e) {
      if (e instanceof Error) {
        this.platform.log.error(`[UpperSwitch][Set] on: ${value}. ${e.message}`)
      }
    }
  }

  async handleBrightnessGet(): Promise<CharacteristicValue> {
    this.platform.log.info(`[Lightbulb][Get] brightness ${this.platform.state.brightness}`);
    return this.platform.state.brightness;
  }

  async handleBrightnessSet(value: CharacteristicValue) {
    try {
      this.platform.log.info(`[Lightbulb][Set] brightness: ${value}`);
      await this.platform.handleBrightnessSet(value);
    } catch (e) {
      if (e instanceof Error) {
        this.platform.log.error(`[UpperSwitch][Set] on: ${value}. ${e.message}`)
      }
    }
  }

  async handleColorTemperatureGet(): Promise<CharacteristicValue> {
    this.platform.log.info(`[Lightbulb][Get] temperature: ${this.platform.state.brightness}`);
    return this.platform.state.colorTemperature;
  }

  async handleColorTemperatureSet(value: CharacteristicValue) {
    try {
      this.platform.log.info(`[Lightbulb][Set] temperature: ${value}`);
      await this.platform.handleColorTemperatureSet(value);
    } catch (e) {
      if (e instanceof Error) {
        this.platform.log.error(`[UpperSwitch][Set] on: ${value}. ${e.message}`)
      }
    }
  }

  update() {
    const state = this.platform.state;
    this.platform.log.info(`[Lightbulb][Update] on: ${state.on} ${state.lightingPoint}`)
    this.service.updateCharacteristic(
      this.platform.Characteristic.On,
      state.on
    );
    const brightness = Math.round(100 / 7 * state.brightnessLevel);
    this.platform.log.info(`[Lightbulb][Update] brightness ${state.brightnessDirection}: ${state.brightnessLevel}`);
    this.service.updateCharacteristic(
      this.platform.Characteristic.Brightness,
      brightness
    );
    const colorTemperature = 140 + 60 * (state.colorTemperatureLevel - 1);
    this.platform.log.info(`[Lightbulb][Update] colorTemperature ${state.colorTemperatureDirection}: ${state.colorTemperatureLevel}`)
    this.service.updateCharacteristic(
      this.platform.Characteristic.ColorTemperature,
      colorTemperature
    );
  }
}
