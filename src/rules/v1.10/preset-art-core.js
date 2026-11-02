(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPresetArt=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Every identity is explicitly registered; no unknown-key or prose-based fallback.
 const BINDINGS={
 "preset:royal-swan":{"artId":"preset.soul.royal-swan","artPath":"/art/royal-swan-v1/martial-soul.webp"},
 "preset:jiumeitu":{"artId":"preset.soul.jiumeitu","artPath":"/art/jiumeitu/jiumeitu-scroll-v2.webp"},
 "preset:taiyin-bili": {"artId":"spirit.taiyin-bili","artPath":"/art/xuanjian/taiyin-bili.webp"},
 "preset:blue-silver-grass": {
  "artId": "preset.soul.blue-silver-grass",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:blue-silver-emperor": {
  "artId": "preset.soul.blue-silver-emperor",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:clear-sky-hammer": {
  "artId": "preset.soul.clear-sky-hammer",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:white-tiger": {
  "artId": "preset.soul.white-tiger",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:nether-cat": {
  "artId": "preset.soul.nether-cat",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:soft-bone-rabbit": {
  "artId": "preset.soul.soft-bone-rabbit",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:evil-fire-phoenix": {
  "artId": "preset.soul.evil-fire-phoenix",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:six-winged-angel": {
  "artId": "preset.soul.six-winged-angel",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:blue-lightning-dragon": {
  "artId": "preset.soul.blue-lightning-dragon",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:seven-treasure-tower": {
  "artId": "preset.soul.seven-treasure-tower",
  "artPath": "/art/presets-v26/towers-and-water.webp"
 },
 "preset:nine-treasure-tower": {
  "artId": "preset.soul.nine-treasure-tower",
  "artPath": "/art/presets-v26/towers-and-water.webp"
 },
 "preset:sausage": {
  "artId": "preset.soul.sausage",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:nine-heart-begonia": {
  "artId": "preset.soul.nine-heart-begonia",
  "artPath": "/art/begonia-v1/martial-soul.webp"
 },
 "preset:jade-phosphor-snake": {
  "artId": "preset.soul.jade-phosphor-snake",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:luo-san-pao": {
  "artId": "preset.soul.luo-san-pao",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:spirit-eyes": {
  "artId": "preset.soul.spirit-eyes",
  "artPath": "/art/presets-v26/souls-1.webp"
 },
 "preset:ice-jade-scorpion": {
  "artId": "preset.soul.ice-jade-scorpion",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:light-goddess-butterfly": {
  "artId": "preset.soul.light-goddess-butterfly",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:shackle-chain": {
  "artId": "preset.soul.shackle-chain",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:woodland-bow": {
  "artId": "preset.soul.woodland-bow",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:patrol-shield": {
  "artId": "preset.soul.patrol-shield",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:clear-wave-lotus": {
  "artId": "preset.soul.clear-wave-lotus",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:healing-staff": {
  "artId": "preset.soul.healing-staff",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:trail-hound": {
  "artId": "preset.soul.trail-hound",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:forge-hammer": {
  "artId": "preset.soul.forge-hammer",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:iron-spear": {
  "artId": "preset.soul.iron-spear",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:sea-bird": {
  "artId": "preset.soul.sea-bird",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:moon-mirror": {
  "artId": "preset.soul.moon-mirror",
  "artPath": "/art/presets-v26/souls-2.webp"
 },
 "preset:grass-entangle": {
  "artId": "skill.vine-bind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:grass-parasitic": {
  "artId": "skill.accuracy",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:grass-web": {
  "artId": "skill.web-bind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:grass-prison": {
  "artId": "skill.wall",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:grass-root-hook": {
  "artId": "skill.bind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:grass-leaf-cover": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:grass-thorn-step": {
  "artId": "skill.wood",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:grass-life-pulse": {
  "artId": "skill.heal",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:hammer-crack": {
  "artId": "skill.metal",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:hammer-repel": {
  "artId": "skill.earth",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:spear-point": {
  "artId": "skill.metal",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:stone-press": {
  "artId": "skill.earth",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:metal-line": {
  "artId": "skill.metal",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:earth-fort": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:metal-mark": {
  "artId": "skill.accuracy",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:stone-wound": {
  "artId": "skill.earth",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:phoenix-fire-line": {
  "artId": "skill.fire-projectile",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:fire-wing": {
  "artId": "skill.flight",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:fire-wave": {
  "artId": "skill.fire-cone",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:fire-ring": {
  "artId": "skill.fire-burst",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:fire-frailty": {
  "artId": "skill.fire-projectile",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:fire-cleanse": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:fire-seal": {
  "artId": "skill.silence",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:fire-ready": {
  "artId": "skill.attribute-buff",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:ice-pincer": {
  "artId": "skill.ice-projectile",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:ice-cage": {
  "artId": "skill.bind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:ice-armor": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:water-tether": {
  "artId": "skill.bind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:water-rinse": {
  "artId": "skill.heal",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:ice-wall": {
  "artId": "skill.wall",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:water-soul": {
  "artId": "skill.soul-restore",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:ice-hush": {
  "artId": "skill.blind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:thunder-claw": {
  "artId": "skill.lightning",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:thunder-chain": {
  "artId": "skill.lightning",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:thunder-stun": {
  "artId": "skill.lightning",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:wind-cut": {
  "artId": "skill.wind",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:wind-run": {
  "artId": "skill.attribute-buff",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:wind-eye": {
  "artId": "skill.accuracy",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:thunder-guard": {
  "artId": "skill.lightning-resistance",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:wind-veil": {
  "artId": "skill.blind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:light-mend": {
  "artId": "skill.heal",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:light-clear": {
  "artId": "skill.resistance",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:light-courage": {
  "artId": "skill.status-guard",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:light-flash": {
  "artId": "skill.light",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:light-regen": {
  "artId": "skill.regeneration",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:light-ward": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:light-dispel": {
  "artId": "skill.light",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:light-breath": {
  "artId": "skill.heal",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:mind-jolt": {
  "artId": "skill.psychic",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:mind-terror": {
  "artId": "skill.fear",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:mind-charm": {
  "artId": "skill.charm",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:mind-sleep": {
  "artId": "skill.sleep",
  "artPath": "/art/fantasy-v4/skills-d.png"
 },
 "preset:mind-desire": {
  "artId": "skill.burn",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:mind-command": {
  "artId": "skill.charm",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:mind-screen": {
  "artId": "skill.resistance",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:mind-watch": {
  "artId": "skill.accuracy",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:soul-scratch": {
  "artId": "skill.soul-damage",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:soul-chain": {
  "artId": "skill.bind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:soul-pact": {
  "artId": "skill.silence",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:soul-hush": {
  "artId": "skill.silence",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:soul-mirror": {
  "artId": "skill.resistance",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:soul-release": {
  "artId": "skill.soul-restore",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:soul-shadow": {
  "artId": "skill.summon",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:soul-disarm": {
  "artId": "skill.soul-damage",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:step-space": {
  "artId": "skill.teleport",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:step-pursuit": {
  "artId": "skill.movement",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:step-disengage": {
  "artId": "skill.speed",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:step-hide": {
  "artId": "skill.dark",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:step-fog": {
  "artId": "skill.blind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:step-flight": {
  "artId": "skill.flight",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:step-slip": {
  "artId": "skill.cleanse",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:step-shove": {
  "artId": "skill.knockback",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:guard-double": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:guard-resist": {
  "artId": "skill.fire-resistance",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:guard-free": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:guard-still": {
  "artId": "skill.status-guard",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:guard-reflect": {
  "artId": "skill.reflection",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:guard-counter": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:guard-invulnerable": {
  "artId": "skill.immunity",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:guard-return": {
  "artId": "skill.resistance",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:field-life": {
  "artId": "skill.domain",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:field-thorns": {
  "artId": "skill.domain",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:summon-wolf": {
  "artId": "skill.summon",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:summon-twins": {
  "artId": "skill.summon",
  "artPath": "/art/generated-v2/skills-support-v2.png"
 },
 "preset:form-stone": {
  "artId": "skill.transformation",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:form-wing": {
  "artId": "skill.transformation",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:form-avatar": {
  "artId": "skill.transformation",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:form-copy": {
  "artId": "skill.copy",
  "artPath": "/art/fantasy-v4/skills-e.png"
 },
 "preset:price-double-bind": {
  "artId": "skill.bind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:price-linked-bind": {
  "artId": "skill.bind",
  "artPath": "/art/generated-v2/skills-control-v2.png"
 },
 "preset:price-blood-mute": {
  "artId": "skill.fire-projectile",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:price-body-strength": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:price-blind-ward": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:price-slow-thrust": {
  "artId": "skill.metal",
  "artPath": "/art/generated-v2/skills-attack-v2.png"
 },
 "preset:price-vulnerable": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:price-hybrid-ward": {
  "artId": "skill.shield",
  "artPath": "/art/generated-v2/skills-defense-v2.png"
 },
 "preset:leaf-heart": {
  "artId": "item.robe",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:echo-bracer": {
  "artId": "item.bracer",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:steady-dagger": {
  "artId": "item.dagger",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:tide-pendant": {
  "artId": "item.pendant",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:bastion-bracer": {
  "artId": "item.bracer",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:vital-lotus": {
  "artId": "item.pendant",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:wind-boots": {
  "artId": "item.boots",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:soul-lens": {
  "artId": "item.crown",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:moon-drape": {
  "artId": "item.bracer",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:gold-sand-armor": {
  "artId": "item.robe",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:sea-scale-charm": {
  "artId": "item.pendant",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:mind-inspector": {
  "artId": "item.pendant",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:ember-ring": {
  "artId": "item.bracelet",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:frost-helm": {
  "artId": "item.helm",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:wind-eaves": {
  "artId": "item.crown",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:iron-striker": {
  "artId": "item.sword",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:wayfarer-mantle": {
  "artId": "item.robe",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:two-mind-ward": {
  "artId": "item.pendant",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:heartplate": {
  "artId": "item.breastplate",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:deepwell-charm": {
  "artId": "item.necklace",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:moonstep-boots": {
  "artId": "item.boots",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:thunder-gloves": {
  "artId": "item.gloves",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:arc-launcher": {
  "artId": "preset.arc-launcher",
  "artPath": "/art/presets-v26/devices.webp"
 },
 "preset:penetrator": {
  "artId": "preset.penetrator",
  "artPath": "/art/presets-v26/devices.webp"
 },
 "preset:tide-projector": {
  "artId": "preset.tide-projector",
  "artPath": "/art/presets-v26/devices.webp"
 },
 "preset:bind-projector": {
  "artId": "item.bracelet",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:guard-lantern": {
  "artId": "item.bracer",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:clear-pulse": {
  "artId": "item.pendant",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:mist-dispenser": {
  "artId": "item.crown",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:marking-sight": {
  "artId": "item.crown",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:silence-chime": {
  "artId": "item.pendant",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "preset:soul-suppressor": {
  "artId": "preset.soul-suppressor",
  "artPath": "/art/presets-v26/devices.webp"
 },
 "preset:tang-qingfeng": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-yanwei": {
  "artId": "item.throwingknife",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-zhuiji": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-biwei": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-ningshuang": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-zhenyu": {
  "artId": "item.throwingknife",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-chanzhi": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-zhelei": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-shikai": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-yindu": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-chuanlin": {
  "artId": "item.throwingknife",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:tang-sanxing": {
  "artId": "item.needles",
  "artPath": "/art/fantasy-v4/hidden-e.png"
 },
 "preset:pill-qingzhi": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-mingyu": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-huixi": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-chengxin": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-songlu": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:pill-lanwen": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:pill-shalu": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:pill-luoyan": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-huijin": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:pill-bizhou": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:pill-yingxue": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-zhumeng": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-suoyuan": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-guinian": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:pill-ningpo": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:soft-sinew": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:heavy-step": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:mute-seed": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:blind-mist": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:sleep-pollen": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:frail-blood": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "preset:desire-ember": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:soul-frost": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:leaden-cloud": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:restraint-restraint-ankles": {
  "artId": "preset.restraint.ankles",
  "artPath": "/art/presets-v26/restraints.webp"
 },
 "preset:restraint-restraint-sinking-wrists": {
  "artId": "preset.restraint.sinking-wrists",
  "artPath": "/art/presets-v26/restraints.webp"
 },
 "preset:restraint-restraint-quicksand-ankles": {
  "artId": "preset.restraint.quicksand-ankles",
  "artPath": "/art/presets-v26/restraints.webp"
 },
 "preset:restraint-restraint-tether": {
  "artId": "preset.restraint.tether",
  "artPath": "/art/presets-v26/restraints.webp"
 },
 "preset:restraint-restraint-net": {
  "artId": "preset.restraint.net",
  "artPath": "/art/presets-v26/restraints.webp"
 },
 "preset:restraint-rope": {
  "artId": "item.rope",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "preset:restraint-restraint-cuffs": {
  "artId": "preset.restraint.cuffs",
  "artPath": "/art/presets-v26/restraints.webp"
 },
 "preset:restraint-restraint-gag": {
  "artId": "preset.restraint.gag",
  "artPath": "/art/presets-v26/restraints.webp"
 },
 "preset:restraint-restraint-seal-collar": {
  "artId": "preset.soul-sealing-collar",
  "artPath": "/art/presets-v26/soul-sealing-collar.webp"
 },
 "preset:restraint-restraint-seal-platform": {
  "artId": "preset.restraint.seal-platform",
  "artPath": "/art/opening-devices/seal-platform-lock.webp"
 },
 "preset:restraint-restraint-slime-suit": {
  "artId": "preset.restraint.slime-suit",
  "artPath": "/art/fantasy-v4/equipment-b.png"
 },
 "preset:beast-mandala-serpent": {
  "artId": "beast.serpent.poison",
  "artPath": "/art/generated-v2/beasts-reptiles-v2.png"
 },
 "preset:beast-comb-tail-serpent": {
  "artId": "preset.beast.comb-tail-serpent",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-stone-coil-serpent": {
  "artId": "beast.serpent.neutral",
  "artPath": "/art/generated-v2/beasts-reptiles-v2.png"
 },
 "preset:beast-frost-line-serpent": {
  "artId": "beast.serpent.ice",
  "artPath": "/art/generated-v2/beasts-reptiles-v2.png"
 },
 "preset:beast-soul-molt-serpent": {
  "artId": "beast.serpent.neutral",
  "artPath": "/art/generated-v2/beasts-reptiles-v2.png"
 },
 "preset:beast-moon-leaf-vine": {
  "artId": "beast.vine.neutral",
  "artPath": "/art/generated-v2/beasts-plants-v2.png"
 },
 "preset:beast-ember-seed-tree": {
  "artId": "beast.tree.fire",
  "artPath": "/art/generated-v2/beasts-plants-v2.png"
 },
 "preset:beast-clear-water-lotus": {
  "artId": "preset.beast.clear-water-lotus",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-moss-moon-fungus": {
  "artId": "beast.fungus.neutral",
  "artPath": "/art/generated-v2/beasts-plants-v2.png"
 },
 "preset:beast-iron-thorn-flower": {
  "artId": "beast.flower.neutral",
  "artPath": "/art/generated-v2/beasts-plants-v2.png"
 },
 "preset:beast-human-face-spider": {
  "artId": "beast.spider.poison",
  "artPath": "/art/generated-v2/beasts-arthropods-v2.png"
 },
 "preset:beast-jade-scorpion": {
  "artId": "beast.scorpion.ice",
  "artPath": "/art/generated-v2/beasts-arthropods-v2.png"
 },
 "preset:beast-thunder-beetle": {
  "artId": "beast.beetle.neutral",
  "artPath": "/art/generated-v2/beasts-arthropods-v2.png"
 },
 "preset:beast-glass-wing-moth": {
  "artId": "preset.beast.glass-wing-moth",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-iron-silk-centipede": {
  "artId": "beast.centipede.poison",
  "artPath": "/art/generated-v2/beasts-arthropods-v2.png"
 },
 "preset:beast-wind-falcon": {
  "artId": "preset.beast.wind-falcon",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-ember-owl": {
  "artId": "beast.owl.fire",
  "artPath": "/art/generated-v2/beasts-air-v2.png"
 },
 "preset:beast-ice-crane": {
  "artId": "preset.beast.ice-crane",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-gold-feather-eagle": {
  "artId": "beast.eagle.neutral",
  "artPath": "/art/generated-v2/beasts-air-v2.png"
 },
 "preset:beast-tide-gull": {
  "artId": "preset.beast.tide-gull",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-shadow-panther": {
  "artId": "beast.leopard.neutral",
  "artPath": "/art/fantasy-v4/beasts-f.png"
 },
 "preset:beast-rock-wolf": {
  "artId": "beast.wolf.neutral",
  "artPath": "/art/generated-v2/beasts-predators-v2.png"
 },
 "preset:beast-flame-lion": {
  "artId": "beast.lion.fire",
  "artPath": "/art/generated-v2/beasts-predators-v2.png"
 },
 "preset:beast-silver-ear-fox": {
  "artId": "beast.fox.neutral",
  "artPath": "/art/generated-v2/beasts-predators-v2.png"
 },
 "preset:beast-frost-stripe-tiger": {
  "artId": "beast.tiger.ice",
  "artPath": "/art/generated-v2/beasts-predators-v2.png"
 },
 "preset:beast-iron-horn-bull": {
  "artId": "beast.bovine.neutral",
  "artPath": "/art/fantasy-v4/beasts-e.png"
 },
 "preset:beast-stone-back-bear": {
  "artId": "beast.bear.neutral",
  "artPath": "/art/generated-v2/beasts-woodland-v2.png"
 },
 "preset:beast-moon-antler-deer": {
  "artId": "beast.deer.neutral",
  "artPath": "/art/generated-v2/beasts-woodland-v2.png"
 },
 "preset:beast-blood-fang-boar": {
  "artId": "beast.boar.neutral",
  "artPath": "/art/generated-v2/beasts-woodland-v2.png"
 },
 "preset:beast-gold-mane-horse": {
  "artId": "beast.equine.neutral",
  "artPath": "/art/fantasy-v4/beasts-e.png"
 },
 "preset:beast-tide-ray": {
  "artId": "beast.ray.water",
  "artPath": "/art/generated-v2/beasts-ocean-v2.png"
 },
 "preset:beast-reef-crab": {
  "artId": "beast.crab.water",
  "artPath": "/art/generated-v2/beasts-invertebrates-v2.png"
 },
 "preset:beast-ink-octopus": {
  "artId": "preset.beast.ink-octopus",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-frost-jaw-shark": {
  "artId": "beast.shark.ice",
  "artPath": "/art/generated-v2/beasts-ocean-v2.png"
 },
 "preset:beast-pearl-snail": {
  "artId": "beast.snail.water",
  "artPath": "/art/generated-v2/beasts-invertebrates-v2.png"
 },
 "preset:beast-soul-lantern-spirit": {
  "artId": "preset.beast.soul-lantern-spirit",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-granite-puppet": {
  "artId": "preset.beast.granite-puppet",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-thunder-cloud-spirit": {
  "artId": "preset.beast.thunder-cloud-spirit",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-mirror-mist-spirit": {
  "artId": "preset.beast.mirror-mist-spirit",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:beast-dawn-crystal-spirit": {
  "artId": "preset.beast.dawn-crystal-spirit",
  "artPath": "/art/presets-v26/beasts.webp"
 },
 "preset:bone-frost-jaw": {
  "artId": "preset.bone.frost-jaw",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-wind-falcon": {
  "artId": "preset.bone.wind-falcon",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-iron-horn": {
  "artId": "preset.bone.iron-horn",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-moon-antler": {
  "artId": "preset.bone.moon-antler",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-stone-bear": {
  "artId": "preset.bone.stone-bear",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-shadow-panther": {
  "artId": "preset.bone.shadow-panther",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-thunder-beetle": {
  "artId": "preset.bone.thunder-beetle",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-water-lotus": {
  "artId": "preset.bone.water-lotus",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-silver-fox": {
  "artId": "preset.bone.silver-fox",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-ink-octopus": {
  "artId": "preset.bone.ink-octopus",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-soul-serpent": {
  "artId": "preset.bone.soul-serpent",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "preset:bone-gold-horse": {
  "artId": "preset.bone.gold-horse",
  "artPath": "/art/presets-v26/bones.webp"
 },
 "shop:pill-bailu": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "shop:pill-chixia": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "shop:bandage": {
  "artId": "item.bandage",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "shop:basic-soul-tonic": {
  "artId": "item.potion",
  "artPath": "/art/generated-v2/items-supplies-v2.png"
 },
 "shop:antidote-pill": {
  "artId": "item.pill-cleanse",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "shop:slaughter-blood-pill": {
  "artId": "item.pill",
  "artPath": "/art/fantasy-v4/supplies-e.png"
 },
 "shop:cloth-common": {
  "artId": "item.robe",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "shop:boots-common": {
  "artId": "item.boots",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "shop:dagger-hunting": {
  "artId": "item.dagger",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "shop:staff-wood": {
  "artId": "item.staff",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "shop:amulet-calm": {
  "artId": "item.necklace",
  "artPath": "/art/generated-v2/items-forms-v2.png"
 },
 "shop:travel-water": {
  "artId": "preset.water-pouch",
  "artPath": "/art/presets-v26/towers-and-water.webp"
 }
};
 for(const id of ['oath-cinder','oath-dormant-star','oath-still-spring','oath-echo','oath-six-cord','oath-silent-bell'])BINDINGS['shop:'+id]={artId:'item.blueprint',artPath:'/art/generated-v2/items-supplies-v2.png'};
 const women=globalThis.SoulCanonicalWomenContent??require('../../shared/canonical-women-content-core.js');
 for(const p of women.PROFILES)BINDINGS[p.SOUL.id]={artId:p.SOUL.artId,artPath:p.SOUL.artPath};
 for(const v of Object.values(BINDINGS))Object.freeze(v);Object.freeze(BINDINGS);
 return Object.freeze({BINDINGS,get:id=>BINDINGS[id]??null});
});
