import fs from 'fs';
import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  CharacteristicValue
} from 'homebridge';
import Axios from 'axios';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import LightbulbAccessory from './LightbulbAccessory';
import MainSwitchAccessory from './MainSwitchAccessory'
import UpperSwitchAccessory from './UpperSwitchAccessory'


type LightingPoint = 'both' | 'main' | 'upper'
type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
type Direction = 'up' | 'down'
type Signal = 'on/off' | 'point' | 'color' | 'brightness'

const SIGNAL_INTERVAL = 500;

interface LightbulbState {
  on: boolean
  lightingPoint: LightingPoint
  brightnessLevel: Level
  brightnessDirection: Direction
  colorTemperatureLevel: Level
  colorTemperatureDirection: Direction
  brightness: number
  colorTemperature: number
}

function signal2Id(signal: Signal, config: LightbulbState): string | undefined {
  switch (signal) {
    case 'on/off':
      return config.signalOnOff
    case 'point':
      return config.signalPoint
    case 'color':
      return config.signalColor
    case  'brightness':
      return config.signalBrightness
    default:
      return undefined
  }
}
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class NatureRemoMultifunctionLightHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];

  public state: LightbulbState = {
    on: false,
    lightingPoint: 'both',
    brightnessLevel: 7,
    brightnessDirection: 'down',
    colorTemperatureLevel: 6,
    colorTemperatureDirection: 'down',
    brightness: 100,
    colorTemperature: 140,
  };

  private lightbulb?: LightbulbAccessory = undefined
  private mainSwitch?: MainSwitchAccessory = undefined
  private upperSwitch?: UpperSwitchAccessory = undefined

  private targetBrightnessLevel?: Level
  private targetColorTemperatureLevel?: Level

  private brightnessTask?: Promise<void>
  private colorTemperatureTask?: Promise<void>

  private configPath = `${this.api.user.storagePath()}/nature-remo-multifunction-light-state.json`

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);
    this.restoreState()
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.logState();
      this.registerPlatformAccessories();
    });
  }

  logState() {
    this.log.info(`[NRML] on: ${this.state.on}`);
    this.log.info(`[NRML] lightingPoint: ${this.state.lightingPoint}`);
    this.log.info(`[NRML] brightness: ${this.state.brightnessDirection} ${this.state.brightnessLevel}`);
    this.log.info(`[NRML] colorTemperature: ${this.state.colorTemperatureDirection} ${this.state.colorTemperatureLevel}`);
  }

  saveState() {
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this.state)
    );
  }

  restoreState() {
    if (fs.existsSync(this.configPath)) {
      this.state = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    }
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  registerPlatformAccessories() {
    this.lightbulb = new LightbulbAccessory(
      this,
      this.registerPlatformAccessory('homebridge-nature-remo-multifunction-light', 'Multifunction Light')
    )
    this.mainSwitch = new MainSwitchAccessory(
      this,
      this.registerPlatformAccessory('homebridge-nature-remo-multifunction-light--main', 'Main')
    )
    this.upperSwitch = new UpperSwitchAccessory(
      this,
      this.registerPlatformAccessory('homebridge-nature-remo-multifunction-light--upper', 'Upper')
    )
  }

  registerPlatformAccessory(id, displayName): PlatformAccessory {
    const uuid = this.api.hap.uuid.generate(id);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      return existingAccessory
    } else {
      this.log.info('Adding new accessory:', displayName);
      const accessory = new this.api.platformAccessory(displayName, uuid);
      accessory.context.device = { id };
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      return accessory;
    }
  }

  requestSignal(signal: Signal) {
    const signalId = signal2Id(signal, this.config)
    return Axios.post(`/signals/${signalId}/send`, null, {
      baseURL: 'https://api.nature.global/1/',
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });
  }

  async turnOfIfNeeded() {
    if(this.state.on) {
      await this.requestSignal('on/off');
      this.state.on = false
    }
  }

  async updateAccessories() {
    this.saveState();
    this.log.info("--------------updateAccessories--------")
    this.lightbulb?.update();
    this.mainSwitch?.update();
    this.upperSwitch?.update();
    this.log.info("--------------updateAccessories end--------")
  }

  async handleLightbulbOnSet(value: CharacteristicValue) {
    if (this.state.on === value) {
      return
    }
    await this.requestSignal('on/off')
    this.state.on = value as boolean;
    this.updateAccessories()
  }

  async handleMainOnSet(value: CharacteristicValue) {
    if (!this.state.on) {
      this.updateAccessories();
      return;
    }
    switch (this.state.lightingPoint) {
      case 'both':
        if (value) {
          // do nothing
        } else {
          await this.requestSignal('point');
          await sleep(SIGNAL_INTERVAL);
          await this.requestSignal('point');
          this.state.lightingPoint = 'upper';
          this.state.on = true;
        }
        break
      case 'main':
        if (value) {
          // do nothing
        } else {
          await this.turnOfIfNeeded()
        }
        break
      case 'upper':
        if (value) {
          await this.requestSignal('point');
          this.state.lightingPoint = 'both';
        } else {
          // do nothing
        }
        break
      default:
        break
    }
    this.updateAccessories();
  }

  async handleUpperOnSet(value: CharacteristicValue) {
    if (!this.state.on) {
      this.updateAccessories();
      return;
    }
    switch (this.state.lightingPoint) {
      case 'both':
        if (value) {
          // do nothing
        } else {
          await this.requestSignal('point');
          this.state.lightingPoint = 'main';
          this.state.on = true;
        }
        break
      case 'main':
        if (value) {
          await this.requestSignal('point');
          await sleep(SIGNAL_INTERVAL);
          await this.requestSignal('point');
          this.state.lightingPoint = 'both';
          this.state.on = true;
        } else {
          // do nothing
        }
        break
      case 'upper':
        if (value) {
          // do nothing
        } else {
          await this.turnOfIfNeeded()
        }
        break
      default:
        break
    }
    this.updateAccessories()
  }

  async handleBrightnessSet(value: CharacteristicValue) {
    const v = value as number;
    this.state.brightness = v;

//    this.nextBrightnessLevel()
    this.targetBrightnessLevel = Math.ceil(v / 100 * 7) as Level;
    this.startBrightnessTaskIfNeeded()
//    this.updateAccessories()
  }

  async handleColorTemperatureSet(value: CharacteristicValue) {
    const v = value as number;
    this.state.colorTemperature = v;

    //this.nextColorTemperatureLevel();
    this.targetColorTemperatureLevel = Math.round((v - 140) / 60) + 1 as Level;
    this.startTemperatureTaskIfNeeded()
//    this.updateAccessories();
  }

  async startBrightnessTaskIfNeeded() {
    if (this.brightnessTask) {
      return;
    }
    this.brightnessTask = (async (resolve, reject) => {
      try {
        await sleep(1);
        if (this.targetBrightnessLevel == this.state.brightnessLevel) {
          this.brightnessTask = undefined
          this.updateAccessories()
          resolve()
        } else {
          await this.nextBrightnessLevel();
          await sleep(SIGNAL_INTERVAL);
          this.brightnessTask = undefined
          this.startBrightnessTaskIfNeeded()
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    })();
  }

  async startTemperatureTaskIfNeeded() {
    if (this.colorTemperatureTask) {
      return;
    }
    this.colorTemperatureTask = (async (resolve, reject) => {
      try {
        await sleep(1);
        if (this.targetColorTemperatureLevel == this.state.colorTemperatureLevel) {
          this.colorTemperatureTask = undefined
          this.updateAccessories()
          resolve()
        } else {
          await this.nextColorTemperatureLevel();
          await sleep(SIGNAL_INTERVAL);
          this.colorTemperatureTask = undefined
          this.startTemperatureTaskIfNeeded()
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    })();
  }

  async nextBrightnessLevel() {
    if (this.state.brightnessDirection == 'up' && this.state.brightnessLevel >= 7) {
      this.state.brightnessDirection = 'down'
    } else if (this.state.brightnessDirection == 'down' && this.state.brightnessLevel <= 1) {
      this.state.brightnessDirection = 'up';
    }
    switch (this.state.brightnessDirection) {
      case 'up':
        await this.requestSignal('brightness');
        this.state.brightnessLevel += 1;
        break
      case 'down':
        await this.requestSignal('brightness');
        this.state.brightnessLevel -= 1;
        break
    }
  }

  async nextColorTemperatureLevel() {
    if (this.state.colorTemperatureDirection == 'up' && this.state.colorTemperatureLevel == 7) {
      this.state.colorTemperatureDirection = 'down'
    } else if (this.state.colorTemperatureDirection == 'down' && this.state.colorTemperatureLevel == 1) {
      this.state.colorTemperatureDirection = 'up';
    }
    switch (this.state.colorTemperatureDirection) {
      case 'up':
        await this.requestSignal('color');
        this.state.colorTemperatureLevel += 1;
        break
      case 'down':
        await this.requestSignal('color');
        this.state.colorTemperatureLevel -= 1;
        break
      default:
        break
    }
  }
}
