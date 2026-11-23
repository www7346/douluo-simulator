'use strict';
const {gzipSync, gunzipSync} = require('node:zlib');
const {rules} = require('../src/rules/index.ts');
const {GameEngine} = require('../src/runtime/engine.ts');
const {defaultStarterDraft} = require('../src/server/creation-starters.ts');
const {exportFullSave, importFullSave} = require('../src/runtime/save-transfer.ts');

module.exports = function makeBattleFixture() {
  const worldId = 'profile-android-emulator-battle';
  const engine = new GameEngine(worldId);
  const opening = engine.dispatch({
    id: 'smoke-create-battle-owner', type: 'player.create', expectedRevision: 0,
    payload: defaultStarterDraft(),
  }).snapshot;
  const state = opening.state;
  const player = state.角色.主控单位ID;
  const foe = Object.keys(state.战斗单位.列表).find(id => id !== player);
  const battle = rules.combat.startBattle(state, {
    id: 'smoke-battle', participantIds: [player, foe], seed: 17, force: true,
    participantConfigs: {
      [player]: {sideId: 'ally', controller: 'player', canFlee: true},
      [foe]: {sideId: 'foe', controller: 'player', canFlee: true},
    },
    positions: {
      [player]: {距离区: '近距', 战场坐标: {x: 40, y: 50}},
      [foe]: {距离区: '近距', 战场坐标: {x: 42, y: 50}},
    },
  }).state;
  battle.战斗.扩展.先攻顺序 = [player, foe];
  battle.战斗.当前行动单位ID = player;
  const portable = gzipSync(exportFullSave({...opening, state: battle, revision: battle.系统.revision}));
  const snapshot = importFullSave(gunzipSync(portable).toString('utf8'));
  const command = {
    id: 'smoke-battle-attack', type: 'battle.action', expectedRevision: snapshot.revision,
    payload: {actorId: player, type: '普通攻击', targetIds: [foe]},
  };
  const expected = new GameEngine(worldId, snapshot).dispatch(command).snapshot.state;
  return {worldId, snapshot, command, player, foe,
    expected: [expected.战斗, expected.战斗单位.列表[player], expected.战斗单位.列表[foe]]};
};
