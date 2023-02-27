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
import axios from 'axios';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import LightbulbAccessory from './LightbulbAccessory';
import MainSwitchAccessory from './MainSwitchAccessory'
import UpperSwitchAccessory from './UpperSwitchAccessory'


type LightingPoint = 'both' | 'main' | 'upper'
type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
type Direction = 'up' | 'down'
type Signal = 'on/off' | 'point' | 'color' | 'brightness'

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

interface NatureRemoMessage {
  format: string
  freq: number
  data: number[]
}

function signal2Id(signal: Signal, config: PlatformConfig): string | undefined {
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

function signal2message(signal: Signal): NatureRemoMessage | undefined {
  switch (signal) {
    case 'on/off':
      return {
        format: "us",
        freq: 39,
        data: [3205,1772,290,1348,305,1349,305,1348,304,525,290,1347,305,1349,307,1347,305,524,291,1363,291,1363,292,1345,307,524,290,507,307,510,304,524,290,524,380,418,305,524,290,510,305,524,290,1363,293,507,307,522,290,509,305,508,392,437,291,1362,290,510,305,1349,305,1364,290,1364,288,1363,291,1363,293,1345,309,522,291,1348,305,507,307,522,290,509,306,524,290,6123,3191,1753,309,1344,333,1321,308,1346,309,520,292,1361,290,1365,290,1363,323,464,316,1350,307,1346,305,1348,308,504,307,510,333,496,290,524,290,507,307,524,290,508,307,524,288,509,333,1320,307,524,290,507,307,509,305,507,309,522,290,1362,290,509,305,1349,306,1348,307,1347,305,1364,291,1363,290,1362,314,485,305,1349,367,462,289,509,307,522,339,448,316,6108,3207,1753,305,1349,305,1349,307,1347,307,504,310,1361,292,1345,309,1345,307,522,292,1362,290,1364,290,1363,291,509,305,524,292,508,307,505,309,507,305,507,307,522,293,507,358,471,291,1361,372,415,316,524,293,507,305,524,327,460,316,1364,290,507,308,1346,307,1348,306,1347,305,1349,305,1364,291,1363,291,506,307,1347,308,523,367,430,307,523,292,507,308]
      };
    case 'point':
      return {
        format: "us",
        freq: 39,
        data: [3268,1685,366,1295,367,1275,369,1296,334,478,358,1296,358,1295,367,1275,369,473,342,1293,367,1278,374,1279,374,437,374,437,370,473,341,456,359,472,341,456,358,454,367,437,368,455,367,1278,366,458,366,438,366,472,343,454,359,1295,365,439,368,456,357,1296,365,1276,345,1320,357,1297,356,1312,342,456,358,1291,341,1317,334,478,367,437,370,453,337,479,333,6074,3269,1684,343,1318,336,1317,337,1317,336,495,317,1337,342,1292,361,1293,360,456,334,1319,334,1319,358,1295,359,453,337,480,366,437,344,479,335,477,337,479,335,478,337,478,335,477,361,1293,367,437,346,478,337,479,332,480,358,1295,367,437,376,435,376,1277,346,1319,334,1333,320,1317,360,1294,336,495,320,1315,367,1279,344,479,359,454,334,478,339,478,336,6071,3240,1721,360,1293,337,1317,359,1295,336,480,335,1319,334,1334,350,1276,344,479,335,1319,334,1319,359,1295,336,475,370,434,348,475,339,477,335,477,370,434,346,477,337,479,335,477,367,1278,344,480,334,478,336,480,337,475,336,1317,367,437,345,478,336,1317,337,1316,337,1317,336,1318,336,1317,336,480,334,1315,337,1320,335,477,337,479,335,477,337,479,335]
      };
    case 'color':
      return {
        format: "us",
        freq: 39,
        data: [3271,1694,356,1298,356,1312,342,1312,341,456,358,1295,365,1277,377,1276,368,455,359,1295,358,1295,335,1319,365,439,366,458,358,454,358,473,342,455,359,472,341,456,335,477,361,455,365,1277,376,439,366,457,365,436,377,1276,369,1295,357,456,358,458,356,1313,341,1293,360,1312,351,1302,341,456,367,462,351,1276,344,1317,360,456,358,454,336,480,365,439,367,6052,3235,1725,365,1277,376,1277,367,1297,335,477,360,1294,359,1295,365,1276,370,453,361,1293,358,1295,367,1279,343,480,334,478,335,496,320,479,357,470,344,456,366,437,368,456,359,452,362,1292,361,455,335,477,367,437,370,1295,364,1277,345,478,359,473,319,1316,367,1275,378,1275,346,1319,335,478,359,453,337,1318,359,1294,336,480,365,438,375,437,345,478,336,6076,3266,1685,365,1312,342,1294,367,1278,344,476,361,1293,367,1275,346,1319,359,453,337,1317,361,1293,367,1278,374,436,379,436,374,437,370,454,361,454,334,479,338,478,365,438,344,480,332,1318,339,477,335,478,336,480,365,1302,319,1316,367,437,370,453,369,1277,343,1317,361,1293,336,1317,339,478,365,434,348,1317,337,1317,334,478,337,479,365,439,344,480,334]
      };
    case  'brightness':
      return {
        format: "us",
        freq: 39,
        data: [3232,1728,331,1323,339,1302,350,1302,343,480,312,1342,331,1322,380,1265,341,483,353,1288,343,1318,342,1305,391,431,309,504,310,505,309,503,358,446,349,466,317,503,335,482,331,482,333,1321,340,464,343,481,309,503,309,504,333,483,309,1342,311,506,350,1292,318,1343,348,1306,350,1304,333,1320,311,1343,331,481,311,1343,312,504,329,483,340,466,320,504,354,6043,3326,1634,374,1290,329,1324,309,1345,331,481,412,1241,333,1321,311,1342,340,464,365,1289,362,1288,343,1318,347,469,309,504,339,464,345,479,311,504,309,503,312,505,333,479,333,483,427,1226,309,503,331,485,331,481,334,482,410,394,316,1344,342,462,384,1281,307,1346,409,1232,322,1343,309,1344,307,1343,313,503,348,1293,345,479,339,465,320,503,344,460,320,6099,3208,1753,309,1345,307,1346,367,1286,309,522,325,1301,319,1343,312,1341,344,460,391,1274,307,1362,290,1345,341,463,318,505,373,444,309,503,335,480,307,505,309,507,305,507,417,413,323,1304,317,507,307,505,309,523,316,481,309,505,310,1341,313,503,309,1345,309,1345,307,1346,307,1347,307,1346,307,1347,305,507,309,1344,309,520,293,507,309,503,309,507,343]
      };
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
    switch (this.config.apiMode) {
      case 'local':
        const message = signal2message(signal)
        return axios.post('/messages', message, {
          baseURL: this.config.localBaseURL,
          headers: {
            "X-Requested-With": "local",
          },
        });
      case 'cloud':
        const signalId = signal2Id(signal, this.config)
        return axios.post(`/signals/${signalId}/send`, null, {
          baseURL: 'https://api.nature.global/1/',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        });
    }
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
          await sleep(this.config.signalInterval);
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
          await sleep(this.config.signalInterval);
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
    this.brightnessTask = (async () => {
      try {
        await sleep(1);
        if (this.targetBrightnessLevel == this.state.brightnessLevel) {
          this.brightnessTask = undefined
          this.updateAccessories()
        } else {
          await this.nextBrightnessLevel();
          await sleep(this.config.signalInterval);
          this.brightnessTask = undefined
          this.startBrightnessTaskIfNeeded()
        }
      } catch (e) {
        if (e instanceof Error) {
          this.log.error(e.message);
        }
        this.brightnessTask = undefined
      }
    })();
  }

  async startTemperatureTaskIfNeeded() {
    if (this.colorTemperatureTask) {
      return;
    }
    this.colorTemperatureTask = (async () => {
      try {
        await sleep(1);
        if (this.targetColorTemperatureLevel == this.state.colorTemperatureLevel) {
          this.colorTemperatureTask = undefined
          this.updateAccessories()
        } else {
          await this.nextColorTemperatureLevel();
          await sleep(this.config.signalInterval);
          this.colorTemperatureTask = undefined
          this.startTemperatureTaskIfNeeded()
        }
      } catch (e) {
        if (e instanceof Error) {
          this.log.error(e.message);
        }
        this.brightnessTask = undefined
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
