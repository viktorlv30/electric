/**
 * Created by v.litvak 03.11.2017.
 */

import * as _ from 'underscore';
import * as express from 'express';
import * as SIO from 'socket.io';
import * as http from 'http';
import { join, posix } from 'path';
import { lookup } from 'dns';
import { SlidesServer, IServerOptions } from 'express-slider';

const { renewNetwork } = require('../../services/system/settings');

import { IDevice, IDeviceParameters } from '../Devices/IDevice';
import { Scale } from '../Devices/Scale/Scale';
import { Printer } from '../Devices/Printer/Printer';
import { IServerRIK } from './IServerRIK';
import { Util } from '../Services/System/Util';
import { PMessage } from './Processing/PMessage';
import { PRequest } from './Processing/PRequest';
import { CreateMediaApp } from '../Media/Media';
import { E_DEVICE_TYPE } from '../Enums/E_DEVICE_TYPE';
import { E_SLIDER_TYPE } from '../Enums/E_SLIDER_TYPE';
import { Panel } from '../Services/Panel/Panel';
import { ISetter } from '../Services/Setter/ISetter';
import { Setter } from '../Services/Setter/Setter';
import { IDeviceState } from '../Devices/IDeviceState';
import { IPanel } from '../Services/Panel/IPanel';

export class ServerRIK implements IServerRIK {
    private _defaultServerPort: number = 3000;
    private _defaultServerHost: string = '127.0.0.1';
    private _serverArgs: { [key: string]: number | string | boolean };
    private _app: express.Application;
    private _port: number;
    private _host: string;
    private _devices: Map<E_DEVICE_TYPE, IDevice>;
    // _devicesState - variable with current devices status: scale and printer
    // by default - an empty object {}
    // this object will collect all props from printer and scale state and store them during server works
    // you shouldn't set to this variable any value directly
    // Use 'SetDevicesState()' to change devicesState
    private _devicesState: Partial<IDeviceState>;
    private _sliders: Map<E_SLIDER_TYPE, SlidesServer>;
    private _panels: IPanel;
    private _mainSocket: SocketIO.Server;
    private _httpServer: http.Server;
    private _processingRequest: PRequest;
    private _processingMessages: PMessage;
    private _settingsSetter: ISetter;

    constructor(args?: { [key: string]: any }) {
        this._settingsSetter = new Setter();
        this._panels = new Panel();
        this._panels.Start();
        this._devices = new Map();
        this._sliders = new Map();
        this._serverArgs = {};
        this._devicesState = {};

        if (args) {
            this._serverArgs = _.clone(args);
        }
        this.Port = this.ServerPortConfigure();
        this.Host = this.ServerHostConfigure();
        this.App = this.ExpressAppConfigure();
    }
    get MainSocket(): SocketIO.Server {
        return this._mainSocket;
    }
    set MainSocket(value: SocketIO.Server) {
        this._mainSocket = value;
    }
    get Port(): number {
        return this._port;
    }
    set Port(value: number) {
        this._port = value;
    }
    get Host(): string {
        return this._host;
    }
    set Host(value: string) {
        this._host = value;
    }
    get App(): express.Application {
        return this._app;
    }
    set App(value: express.Application) {
        this._app = value;
    }
    get HttpServer(): http.Server {
        return this._httpServer;
    }
    set HttpServer(value: http.Server) {
        this._httpServer = value;
    }

    /**
     * Start server
     * Firstly, before Start() you should set Host and Port
     * If you don't set the Port it will be 3000
     * If you don't set the Host it will be '127.0.0.1'
     */
    Start(): void {
        this.HttpServer = this.RunServer();
        this.MainSocket = SIO(this.HttpServer);
        this.MainSocket.on('connection', this.MainSocketCallback.bind(this));
        this.RunAllDevices();

        let mainSlider = this._sliders.get(E_SLIDER_TYPE.MAIN_SLIDER);
        if (mainSlider) {
            this.SliderConfigure(mainSlider, this.HttpServer);
            mainSlider.refresh();
        }
        let secondarySlider = this._sliders.get(E_SLIDER_TYPE.SECONDARY_SLIDER);
        if (secondarySlider) {
            this.SliderConfigure(secondarySlider, this.HttpServer);
            secondarySlider.refresh();
        }

        try {
            console.info('renew network');
            renewNetwork();
        } catch (error) {
            console.error(`RENEW NETWORK ERROR: ${Util.extractError(error)}`);
        }
    }

    /**
     * Stop server
     */
    Stop(code: number): void {
        process.exit(code);
    }

    /**
     * Get device by name
     * @param name - string device name from enum E_DEVICE_TYPE in Map (e.g. 'printer', 'scale'....)
     * @returns {IDevice | null} - object of Printer or Scale or another device object as IDevice interface. If device not exists - null
     */
    Device(name: E_DEVICE_TYPE): IDevice | null {
        let result = null;
        let isDeviceExist = this._devices.has(name);
        if (isDeviceExist) {
            let device = this._devices.get(name);
            if (device) {
                result = device;
            }
        }
        return result;
    }

    /**
     * Registering new device on server(printer, scale...)
     * @param type - name of device from enum
     * @param parameters - IDeviceParameters - initial parameters for device
     */
    AddDevice(type: E_DEVICE_TYPE, parameters: IDeviceParameters): IDevice | null {
        let device: IDevice | null = null;
        switch (type) {
            case E_DEVICE_TYPE.PRINTER:
                device = new Printer(parameters);
                break;
            case E_DEVICE_TYPE.SCALE:
                device = new Scale(parameters);
                break;
            default:
                device = null;
                console.error(`CAN'T CREATE DEVICE '${type}'. UNKNOWN DEVICE TYPE`);
                break;
        }
        if (device) {
            this._devices.set(type, device);
        }
        return device;
    }

    /**
     * SetDevicesState - set data to devicesState variable
     * @param {[key: string]: any} value - any property of scale or printer device (actually Partial<IDeviceState>)
     */
    private UpdateDevicesState(value: { [key: string]: any }): Partial<IDeviceState> {
        if (value && typeof value === 'object') {
            return Object.assign(this._devicesState, value);
        } else {
            return this._devicesState;
        }
    }

    /**
     * Add slider object to the _sliders Map() storage 
     * @param type slider name from 'E_SLIDER_TYPE'
     * @param options - Partial<IServerOptions> | undefined
     * @returns {SlidesServer}
     */
    AddSlider(type: E_SLIDER_TYPE, options?: Partial<IServerOptions> | undefined): SlidesServer {
        let slider = new SlidesServer(options);
        if (this._sliders.has(type)) {
            throw `Can't create slider with the same name ${type}. The same slider was created before!`;
        }
        this._sliders.set(type, slider);
        this.App.use(slider.express);
        return slider;
    }

    /**
     * Run server and start listening port 
     */
    private RunServer(): http.Server {
        let server: http.Server = this.App.listen(this.Port, () => {
            console.log(`Application listening at http://${this.Host}:${this.Port}`);
        });
        return server;
    }

    /**
     * Run all registered devices on server(scale, printer)
     */
    private RunAllDevices(): void {
        this._devices.forEach((device) => {
            device.SetupSocket(this.MainSocket, this.RingoEmit.bind(this));
            device.SettingsSetter = this._settingsSetter;
            device.Start();
        });
    }

    /**
     * Run specified device
     * @param name of device from enum
     */
    private RunDevice(name: E_DEVICE_TYPE): void {
        let device = this.Device(name);
        if (device) {
            device.SetupSocket(this.MainSocket, this.RingoEmit.bind(this));
            device.SettingsSetter = this._settingsSetter;
            device.Start();
        } else {
            console.error(`DEVICE DOES NOT EXIST: '${name}'`);
        }
    }

    /**
     * Make emit to devices socket 
     * @param message 
     */
    //private _previousMessage - used only for RingoEmit method - used only for console information
    private _previousMessage: { message: string, data: any } = { message: '', data: {} };
    private async RingoEmit(message: string): Promise<void> {
        try {
            let splitMessage = message.split('}{');
            for (var i = 0; i < splitMessage.length; i++) {
                let message_part = (i !== 0 ? '{' : '') + splitMessage[i] + (i !== splitMessage.length - 1 ? '}' : '');
                let incomingData = JSON.parse(message_part);
                this.UpdateDevicesState(incomingData.data);
                switch (incomingData.message) {
                    case "priceCalculatingDone":
                        console.log(`RingoEmit => '${incomingData.message}' %j`, incomingData.data);
                        await this._processingMessages.PriceCalculatingDone(incomingData.data);
                        this.MainSocket.emit(incomingData.message, incomingData.data);
                        break;
                    case 'response':
                        // console.log(`Do nothing when got 'response'`);
                        break;
                    default:
                        if (!(this._previousMessage.message === incomingData.message && incomingData.data.hasOwnProperty('clearWeight'))) {
                            console.log(`RingoEmit (default) => '${incomingData.message}' %j`, incomingData.data);
                        }
                        _.extend(this._previousMessage, incomingData);
                        this.MainSocket.emit(incomingData.message, incomingData.data);
                }
            }
        } catch (e) {
            console.log(e);
        }
    }

    /**
     * Set server's port from 'process.env.PORT'
     * If 'process.env.PORT' is undefined => will be check is constructor of server has 'port' field, and set this port if specified
     * If port is not correct or doesn't exist => will be set default port from = 3000
     * If port set by user via this.Port => it will have the highest priority, even you have set port by any other way before
     */
    private ServerPortConfigure(): number {
        let portEnv: any = process.env.PORT;
        portEnv = portEnv ? portEnv : this._serverArgs['port'];
        let port: number;
        if (portEnv && !isNaN(parseInt(portEnv))) {
            port = parseInt(portEnv);
        } else {
            port = this._defaultServerPort;
        }
        return port;
    }

    /**
     * Set server's host
     * If host didn't set by constructor as 'host' => will be set default host '127.0.0.1'
     * If host set by user via this.Host => it will have the highest priority, even you have set host by any other way before
     */
    private ServerHostConfigure(): string {
        let host: string | undefined;
        if (typeof this._serverArgs.host === 'string') {
            host = this._serverArgs.host.toString();
        }
        if (!this._host) {
            host = host ? host : this._defaultServerHost;
        } else {
            host = this._host;
        }
        return host;
    }

    /**
     * Make settings for express Application, routes
     */
    private ExpressAppConfigure(): express.Application {
        let app: express.Application = express();
        app.use(express.static(join(__dirname, '../../', 'public')));
        app.get('/', (req, res) => {
            res.sendFile(join(__dirname, '../../', 'public', 'index.html'));
        });

        app.get('/secondary-screen', (req, res) => {
            res.sendFile(join(__dirname, '../../', 'public', 'secondary.html'))
        });
        app.use(CreateMediaApp());
        return app;
    }

    /**
     * ConfigureProcessing - set settings for all socket requests processing
     * Pass to Processing instance link for devices, MainClient - SocketIO.Server, and current client which was created when new connection established
     * @param client 
     */
    private ConfigureProcessing(client: SocketIO.Socket): void {
        this._processingRequest = PRequest.Instance(); // not singleton
        this._processingRequest.SetDevices(this._devices);
        this._processingRequest.SetClientSocket(client);

        this._processingMessages = PMessage.Instance(); // not singleton
        this._processingMessages.SetDevices(this._devices);
        this._processingMessages.RegisterMainSocket(this.MainSocket);
        this._processingMessages.SetClientSocket(client);
        this._processingMessages.SetPanel(this._panels);
        this._processingMessages.SettingsSetter = this._settingsSetter;

        //emit current devices state to client
        console.log(`Server => Immediately is sending devices state to client ${this._processingRequest.IpAddress} %j`, this._devicesState);
        client.emit('changed', this._devicesState);
    }

    /**
     * SliderConfigure - set settings for sliders
     * @param slides SlidesServer object
     * @param server http.Server - main server object (this)
     */
    private SliderConfigure(slides: SlidesServer, server: http.Server): SocketIO.Server {
        let socket = SIO(server, { path: posix.join(slides.prefix, 'socket.io') });

        function addClient(client: SocketIO.Socket) {
            slides.model.start();
            client.emit('changed', {
                slides: slides.model.slides,
                current: slides.model.current
            });
            client.once('disconnect', () => {
                if (socket.clients.length === 0) {
                    slides.model.stop();
                }
            });
            client.once('connect', addClient.bind(undefined, client));
        }

        socket.on('connection', addClient);
        slides.model.on('changed', (data) => {
            socket.emit('changed', data);
        });
        return socket;
    }

    /**
     * MainSocketCallback - initializing all request processing handlers after made connection via Socket and 'connection' event
     * Creates new instance of PMessage and PRequest for every new connection
     * Then registers handler for every type of socket emit: 'request', 'messages'...
     * @param client SocketIO.Socket client for every connected client
     */
    private async MainSocketCallback(client: SocketIO.Socket) {

        // in this method we are configuring handlers for all socket's requests type: at the moment 'request' and 'messages'
        // we are initializing this._processingMessages and this._processingRequest
        this.ConfigureProcessing(client);

        console.log('Client connected...', this._processingRequest.IpAddress);

        //emit current devices state to client
        console.log(`Server => Immediately is sending devices state to client ${this._processingRequest.IpAddress} %j`, this._devicesState);
        client.emit('changed', this._devicesState);

        this._processingMessages.RequestRingo(E_DEVICE_TYPE.SCALE, 'getState', {});
        this._processingMessages.RequestRingo(E_DEVICE_TYPE.PRINTER, 'getState', {});

        client.on('request', this._processingRequest.Handler.bind(this._processingRequest));

        client.on('messages', this._processingMessages.Handler.bind(this._processingMessages));

        client.on('error', console.error);
    }
}
