const field = foundry.data.fields;

class Mods extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            misc: new field.NumberField({nullable:true})
        }
    }
    get total(){
        return Object.values(this).reduce((a,b)=>a+b,0);
    }
};
class Health extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            xhp: new field.SchemaField({
                value: new field.NumberField({initial:6,min:0}),
                formula: new field.StringField({initial:"(3+@con.mod)*(@lvl+1)"}),
                mods: new field.EmbeddedDataField(Mods),
            }),
            chp: new field.SchemaField({
                value: new field.NumberField({initial:12}),
                formula: new field.StringField({initial:"@con.score+2"}),
                mods: new field.EmbeddedDataField(Mods)
            }),
            temp: new field.NumberField({initial:0}),
            notes: new field.StringField({initial:""}),
            bleed: new field.NumberField({initial:0}),
            incoming: new field.NumberField({initial:0}),
            damageReport: new field.StringField({initial:""})
        }
    }
};
class CombatPoints extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            value: new field.NumberField({initial:15}),
            max: new field.NumberField({initial:15}),
            temp: new field.NumberField({initial:0}),
            armor: new field.EmbeddedDataField(Mods)
        }
    }
};
class Defense extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            equip: new field.EmbeddedDataField(Mods),
            size: new field.NumberField({initial:0}),
            move: new field.NumberField({initial:0}),
            misc: new field.NumberField({initial:0}),
            dodge: new field.EmbeddedDataField(Mods)
        }
    }
};
export class OpsCharacter extends foundry.abstract.DataModel {
    static defineSchema(){
        return {
            health: new field.EmbeddedDataField(Health),
            cp: new field.EmbeddedDataField(CombatPoints),
            def: new field.EmbeddedDataField(Defense),
            stats: new field.SchemaField({
                init: new field.EmbeddedDataField(Mods),
                bab: new field.EmbeddedDataField(Mods),
                recoil: new field.EmbeddedDataField(Mods),
                wager: new field.NumberField({initial:0}),
                armorPenalty: new field.EmbeddedDataField(Mods),
                level: new field.SchemaField({
                    value: new field.NumberField({initial:1}),
                    xp: new field.SchemaField({
                        value: new field.NumberField({initial:0})
                    })
                }),
                carrying: new field.SchemaField({
                    formula: new field.StringField({initial:"@str.score*4"}),
                    mods: new field.EmbeddedDataField(Mods),
                })
            }),
            details: new field.SchemaField({
                biography: new field.StringField(),
                size: new field.StringField({initial:"Medium"}),
                race: new field.StringField(),
                occupation: new field.StringField()
            }),
            ml: new field.SchemaField({
                formula: new field.StringField({initial:"((6+@wis.score)*@lvl)+40"}),
                mods: new field.EmbeddedDataField(Mods),
                temp: new field.NumberField({initial:0}),
            }),
            magic: new field.SchemaField({
                psionFocus: new field.BooleanField({initial:false}),
                memorizedSets: new field.NumberField({initial:0}),
                mlCant: new field.NumberField({initial:0}),
                mods: new field.EmbeddedDataField(Mods),
            }),
            abilities: new field.SchemaField({
                str: new field.SchemaField({
                    score: new field.NumberField({initial:10}),
                    modMods: new field.EmbeddedDataField(Mods),
                    foc: new field.NumberField({initial:0})
                }),
                dex: new field.SchemaField({
                    score: new field.NumberField({initial:10}),
                    modMods: new field.EmbeddedDataField(Mods),
                    mrk: new field.NumberField({initial:0})
                }),
                con: new field.SchemaField({
                    score: new field.NumberField({initial:10}),
                    modMods: new field.EmbeddedDataField(Mods),
                }),
                int: new field.SchemaField({
                    score: new field.NumberField({initial:10}),
                    modMods: new field.EmbeddedDataField(Mods),
                }),
                wis: new field.SchemaField({
                    score: new field.NumberField({initial:10}),
                    modMods: new field.EmbeddedDataField(Mods),
                }),
                cha: new field.SchemaField({
                    score: new field.NumberField({initial:10}),
                    modMods: new field.EmbeddedDataField(Mods),
                })
            }),
            saves: new field.SchemaField({
                fortitude: new field.SchemaField({
                    base: new field.NumberField({initial:0}),
                    mult: new field.NumberField({initial:1}),
                    mods: new field.EmbeddedDataField(Mods),
                }),
                reflex: new field.SchemaField({
                    base: new field.NumberField({initial:0}),
                    mult: new field.NumberField({initial:1}),
                    mods: new field.EmbeddedDataField(Mods),
                }),
                will: new field.SchemaField({
                    base: new field.NumberField({initial:0}),
                    mult: new field.NumberField({initial:1}),
                    mods: new field.EmbeddedDataField(Mods),
                })
            }),
            wealth: new field.SchemaField({
                description: new field.StringField(),
                wp: new field.SchemaField({
                    income: new field.StringField({initial:"(@cha.mod*5)"}),
                    notes: new field.StringField(),
                    cash: new field.NumberField({nullable:true}),
                    credit: new field.NumberField({nullable:true}),
                    check: new field.NumberField({nullable:true})
                }),
                capital: new field.SchemaField({
                    personal: new field.SchemaField({
                        hard: new field.NumberField({nullable:true})
                    }),
                    external: new field.SchemaField({
                        total: new field.NumberField({nullable:true}),
                        hard: new field.NumberField({nullable:true})
                    }),
                })
            })
        };
    };
};