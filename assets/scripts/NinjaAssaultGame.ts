import { _decorator } from 'cc';
import { NinjaRushPortGame } from './ninja_rush_port/NinjaRushPortGame';

const { ccclass } = _decorator;

@ccclass('NinjaAssaultGame')
export class NinjaAssaultGame extends NinjaRushPortGame {}
