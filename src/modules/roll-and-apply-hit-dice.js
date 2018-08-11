import { R20Module } from "../tools/r20Module";
import { R20 } from "../tools/r20api";

class RollAndApplyHitDiceModule extends R20Module.SimpleBase {
    constructor(id) {
        super(id);

        this.rollAndApplyHitDice = this.rollAndApplyHitDice.bind(this);
    }

    fancySay(msg, callback) {
        R20.sayToSelf(`&{template:default} {{name=R20ES Hit Dice}} {{${msg}}}`, callback);
    }

    rollAndApplyHitDice(objects) {

        const config = this.getHook().config;

        // tokens will locally disappear if we do not unselect them here
        const oldSel = R20.getSelectedTokens();
        R20.unselectTokens();

        let numRolled = 0;

        for (let token of objects) {

            if (!token.model || !token.model.character) continue;

            let attribs = token.model.character.attribs;



            // find hpForumla
            let hpFormula = null;
            for (let attrib of attribs.models) {
                if (!hpFormula && attrib.attributes.name === config.diceFormulaAttribute) {
                    hpFormula = attrib.attributes.current;
                    break;
                }
            }

            if (!hpFormula) {
                this.fancySay(`Could not find attribute ${config.diceFormulaAttribute}`);

                continue;
            }

            this.fancySay(`${token.model.character.get("name")}: [[${hpFormula}]]`, (_, o) => {
                if (!o.inlinerolls || o.inlinerolls.length <= 0) return;

                let hp = o.inlinerolls[0].results.total;

                let barValue = config.bar + "_value";
                let barMax = config.bar + "_max";
                let save = {};
                save[barValue] = hp;
                save[barMax] = hp;
                token.model.save(save);

                // reselect when we're done processing all callbacks.
                numRolled++;
                if (numRolled >= objects.length) {
                    for (let sel of oldSel) {
                        R20.addTokenToSelection(sel);
                    }
                }
            });
        }
    }

    setup() {
        window.r20es.rollAndApplyHitDice = this.rollAndApplyHitDice;
    }

    dispose() {
        window.r20es.rollAndApplyHitDice = null;
    }
}

if (R20Module.canInstall()) new RollAndApplyHitDiceModule(__filename).install();

const hook = R20Module.makeHook(__filename, {
    id: "rollAndApplyHitDice",
    name: "Roll and apply hit dice",
    description: `Adds a "Hit Dice" option to the token right click menu which rolls and applies hit dice for the selected tokens.`,
    category: R20Module.category.token,
    gmOnly: true,

    mods: [
        {
            includes: "/editor/",
            find: "<li class='head hasSub' data-action-type='addturn'>Add Turn</li>",
            patch: `<li class='head hasSub' data-action-type='addturn'>Add Turn</li>
<li class='head hasSub' data-action-type='r20es-hit-dice'>Hit Dice</li>`,
        },

        {
            includes: "assets/app.js",
            find: `else if("toback"==e)`,
            patch: `else if("r20es-hit-dice"==e && window.r20es && window.r20es.rollAndApplyHitDice) window.r20es.rollAndApplyHitDice(n), i(), d20.token_editor.removeRadialMenu();else if("toback"==e)`
        }
    ],

    configView: {
        diceFormulaAttribute: {
            display: "Hit dice formula attribute",
            type: "string",
        },
        bar: {
            display: "HP Bar",
            type: "dropdown",

            dropdownValues: {
                bar1: "Bar 1",
                bar2: "Bar 2",
                bar3: "Bar 3"
            },
        }
    },

    config: {
        diceFormulaAttribute: "npc_hpformula",
        bar: "bar3",
    }
});

export { hook as rollAndApplyHitDiceHook }