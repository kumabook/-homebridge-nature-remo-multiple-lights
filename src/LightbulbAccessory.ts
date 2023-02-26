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
    console.log(`[Lightbulb][Get] on: ${this.platform.state.on}`);
    return this.platform.state.on;
  }

  async handleOnSet(value: CharacteristicValue) {
    try {
      console.log(`[Lightbulb][Set] on: ${value}`);
      await this.platform.handleLightbulbOnSet(value);
    } catch (e) {
      console.error(`[Lightbulb][Set] on: ${value}. ${e}`)
    }
  }

  async handleBrightnessGet(): Promise<CharacteristicValue> {
    console.log(`[Lightbulb][Get] brightness ${this.platform.state.brightness}`);
    return this.platform.state.brightness;
  }

  async handleBrightnessSet(value: CharacteristicValue) {
    try {
      console.log(`[Lightbulb][Set] brightness: ${value}`);
      await this.platform.handleBrightnessSet(value);
    } catch (e) {
      console.error(`[Lightbulb][Set] brightness: ${value}. ${e}`)
    }
  }

  async handleColorTemperatureGet(): Promise<CharacteristicValue> {
    console.log(`[Lightbulb][Get] temperature: ${this.platform.state.brightness}`);
    return this.platform.state.colorTemperature;
  }

  async handleColorTemperatureSet(value: CharacteristicValue) {
    try {
      console.log(`[Lightbulb][Set] temperature: ${value}`);
      await this.platform.handleColorTemperatureSet(value);
    } catch (e) {
      console.error(`[Lightbulb][Set] temperature: ${value}. ${e}`)
    }
  }

  update() {
    const state = this.platform.state;
    console.log(`[Lightbulb][Update] on: ${state.on} ${state.lightingPoint}`)
    this.service.updateCharacteristic(
      this.platform.Characteristic.On,
      state.on
    );
    const brightness = Math.round(100 / 7 * state.brightnessLevel);
    console.log(`[Lightbulb][Update] brightness ${state.brightnessDirection}: ${state.brightnessLevel}`);
    this.service.updateCharacteristic(
      this.platform.Characteristic.Brightness,
      brightness
    );
    const colorTemperature = 140 + 60 * (state.colorTemperatureLevel - 1);
    console.log(`[Lightbulb][Update] colorTemperature ${state.colorTemperatureDirection}: ${state.colorTemperatureLevel}`)
    this.service.updateCharacteristic(
      this.platform.Characteristic.ColorTemperature,
      colorTemperature
    );
  }
}
