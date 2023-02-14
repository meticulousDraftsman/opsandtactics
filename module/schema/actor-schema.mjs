const field = foundry.data.fields;

class AbilityScore extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            value: new field.NumberField({initial:10,nullable:false}),
            modMisc: new field.NumberField({initial:0})
        }
    }
};
class SavingThrow extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            base: new field.NumberField({initial:0}),
            misc: new field.NumberField({initial:0})
        }
    }
};
class Misc extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            misc: new field.NumberField({initial:0})
        }
    }
};
class Health extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            xhp: new field.SchemaField({
                value: new field.NumberField({initial:6,min:0}),
                formula: new field.StringField({initial:"(3+@con.mod)*(@lvl+1)"}),
                misc: new field.NumberField({initial:0,nullable:false})
            }),
            chp: new field.SchemaField({
                value: new field.NumberField({initial:12}),
                factors: new field.SchemaField({
                    race: new field.NumberField({initial:2}),
                    misc: new field.NumberField({initial:0})
                })
            }),
            notes: new field.StringField({initial:""}),
            temp: new field.NumberField({initial:0}),
            bleed: new field.NumberField({initial:0}),
            incoming: new field.NumberField({initial:0}),
            incomingReport: new field.SchemaField({
                log: new field.ArrayField(
                    new field.StringField({initial:""}),
                    {initial:[]}),
                message: new field.StringField({initial:""})
            })
        }
    }
};
class CombatPoints extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            value: new field.NumberField({initial:15}),
            max: new field.NumberField({initial:15}),
            temp: new field.NumberField({initial:0}),
            armor: new field.SchemaField({
                misc: new field.NumberField({initial:0})
            }),
        }
    }
};
class Defense extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            equip: new field.SchemaField({
                misc: new field.NumberField({initial:0})
            }),
            size: new field.NumberField({initial:0}),
            move: new field.NumberField({initial:0}),
            misc: new field.NumberField({initial:0}),
            dodge: new field.NumberField({initial:0})
        }
    }
};
export class OpsCharacter extends foundry.abstract.DataModel {
    static defineSchema(){
        return {
            health: new field.EmbeddedDataField(Health),
            cp: new field.EmbeddedDataField(CombatPoints),
            def: new field.EmbeddedDataField(Defense),
            init: new field.EmbeddedDataField(Misc),
            biography: new field.StringField(),
            size: new field.StringField({initial:"Medium"}),
            race: new field.StringField({initial:"Human"}),
            level: new field.SchemaField({
                value: new field.NumberField({initial:1}),
                xp: new field.SchemaField({
                    value: new field.NumberField({initial:0})
                })
            }),
            carrying: new field.SchemaField({
                capacity: new field.StringField({initial:"@str.value*4"}),
            }),
            bab: new field.EmbeddedDataField(Misc),
            recoil: new field.EmbeddedDataField(Misc),
            ml: new field.SchemaField({
                formula: new field.StringField({initial:"((6+@wis.value)*@lvl)+40"}),
                misc: new field.NumberField({initial:0,nullable:false}),
                temp: new field.NumberField({initial:0,nullable:false}),
                aug: new field.NumberField({initial:0,nullable:false})
            }),
            magic: new field.SchemaField({
                psionFocus: new field.BooleanField({initial:false}),
                memorized: new field.NumberField({initial:0}),
                incant: new field.NumberField({initial:0})
            }),
            abilities: new field.SchemaField({
                str: new field.EmbeddedDataField(AbilityScore),
                foc: new field.SchemaField({
                    mod: new field.NumberField({initial:0}),
                }),
                pow: new field.SchemaField({
                }),
                dex: new field.EmbeddedDataField(AbilityScore),
                mrk: new field.SchemaField({
                    mod: new field.NumberField({initial:0}),
                }),
                agi: new field.SchemaField({
                }),
                con: new field.EmbeddedDataField(AbilityScore),
                int: new field.EmbeddedDataField(AbilityScore),
                wis: new field.EmbeddedDataField(AbilityScore),
                cha: new field.EmbeddedDataField(AbilityScore)
            }),
            saves: new field.SchemaField({
                fortitude: new field.EmbeddedDataField(SavingThrow),
                reflex: new field.EmbeddedDataField(SavingThrow),
                will: new field.EmbeddedDataField(SavingThrow)
            }),
            wealth: new field.SchemaField({
                wp: new field.NumberField({initial:0}),
                income: new field.StringField({initial:"(@cha.mod)*5"}),
                notes: new field.StringField(),
                capital: new field.SchemaField({
                    personal: new field.SchemaField({
                        hard: new field.NumberField({initial:0})
                    }),
                    external: new field.SchemaField({
                        total: new field.NumberField({initial:0}),
                        hard: new field.NumberField({initial:0})
                    }),
                })
            })
        };
    };
};