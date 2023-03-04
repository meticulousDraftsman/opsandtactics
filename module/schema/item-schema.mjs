const field = foundry.data.fields;

class Gear extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            size: new field.StringField({initial:""}),
            weight: new field.NumberField({initial:0}),
            cost: new field.NumberField({initial:0}),
            quality: new field.StringField({initial:""}),
            restriction: new field.StringField({initial:""}),
            physical: new field.BooleanField({initial:true}),
            location: new field.SchemaField({
                parent: new field.StringField({initial:"Loose"}),
                note: new field.StringField({initial:""})
            }),
            resources: new field.ArrayField(
                new field.SchemaField({
                    name: new field.StringField(),
                    value: new field.StringField(),
                    max: new field.StringField()
                })
            )
        }
    }
};

export class OpsSkill extends foundry.abstract.DataModel {
    static defineSchema(){
        return{
            description: new field.StringField(),
            ranks: new field.NumberField({initial:0}),
            ability: new field.StringField(),
            focus: new field.StringField({initial:"unfocus"}),
            armor: new field.SchemaField({
                active: new field.BooleanField({initial:false}), 
            }),
            mods: new field.ObjectField({}),
        }
    };
};
export class SkillMod extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField(),
            type: new field.StringField({initial:"misc"}),
            value: new field.NumberField({positive:false}),
            active: new field.BooleanField({initial:true})
        }
    }
};
export class OpsArmor extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            description: new field.StringField(),
            layer: new field.StringField({initial:'worn'}),
            active: new field.BooleanField({initial:false}),
            def: new field.NumberField(),
            agiMax: new field.NumberField(),
            penalty: new field.NumberField(),
            cpLoss: new field.NumberField(),
            protection: new field.ObjectField(),
            activeDR: new field.StringField(),
            ap: new field.SchemaField({
                value: new field.NumberField({initial:0}),
                max: new field.NumberField({initial:0})
            }),
            coolant: new field.StringField(),
            gear: new field.EmbeddedDataField(Gear)
        }
    }
};
export class Protection extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField(),
            value: new field.NumberField()
        }
    }
}
export class OpsWeapon extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            description: new field.StringField(),
            type: new field.StringField(),
            magazine: new field.SchemaField({
                loaded: new field.SchemaField({
                    source: new field.StringField(),
                }),
                type: new field.StringField({initial:"internal"}),
                value: new field.NumberField({initial:0}),
                max: new field.NumberField({initial:0})
            }),
            range: new field.StringField({initial:"5ft"}),
            weaponMods: new field.ObjectField(),
            attacks: new field.ObjectField(),
            selectMod: new field.StringField(),
            gear: new field.EmbeddedDataField(Gear)
        }
    }
}
export class WeaponMod extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField({initial:"Source",nullable:false}),
            description: new field.StringField(),
            hit: new field.NumberField({initial:null,nullable:true}),
            damage: new field.StringField({initial:null,nullable:true}),
            recoil: new field.NumberField({initial:null,nullable:true}),
            cp: new field.NumberField({initial:null,nullable:true})
        }
    }
}
export class Attack extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField({initial:"Attack"}),
            description: new field.StringField(),
            display: new field.BooleanField({initial:true}),
            ammo: new field.NumberField({initial:0}),
            hit: new field.SchemaField({
                attack: new field.NumberField(),
                ability: new field.StringField(),
                mods: new field.ObjectField()
            }),
            damage: new field.SchemaField({
                attack: new field.StringField(),
                ability: new field.StringField(),
                scaleAbility: new field.NumberField({initial:1}),
                mods: new field.ObjectField()
            }),
            recoil: new field.SchemaField({
                attack: new field.NumberField({initial:null,nullable:true}),
                mods: new field.ObjectField()
            }),
            cp: new field.SchemaField({
                attack: new field.NumberField(),
                mods: new field.ObjectField()
            })
        }
    }
}
export class OpsMagazine extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            description: new field.StringField(),
            hasLabel: new field.BooleanField({initial:true}),
            coolant: new field.SchemaField({
                hot: new field.StringField({initial:'Cool'})
            }),
            magazine: new field.SchemaField({
                type: new field.StringField({initial:'external'}),
                value: new field.NumberField({initial:0}),
                max: new field.NumberField({initial:0})
            }),
            gear: new field.EmbeddedDataField(Gear)
        }
    }
}
export class OpsObject extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            description: new field.StringField(),
            gear: new field.EmbeddedDataField(Gear)
        }
    }
}
export class OpsFeature extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            description: new field.StringField(),
            summary: new field.StringField()
        }
    }
}
export class OpsMagic extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            description: new field.StringField(),
            flags: new field.SchemaField({}),
            uses: new field.SchemaField({
                type: new field.StringField({initial:"limited"}),
                value: new field.NumberField({initial:0}),
                max: new field.NumberField({initial:0}),
                shared: new field.SchemaField({
                    source: new field.StringField(),
                })
            }),
            mlCost: new field.SchemaField({
                type: new field.StringField({initial:"passive"}),
                value: new field.NumberField({initial:0})
            }),
            active: new field.BooleanField({initial:true}),
            cp: new field.NumberField({initial:7}),
            notes: new field.StringField(),
            range: new field.StringField(),
            action: new field.SchemaField({
                type: new field.StringField({initial:"attack"}),
                ability: new field.StringField(),
                misc: new field.StringField(),
                flavor: new field.StringField()
            }),
            effect: new field.SchemaField({
                type: new field.StringField({initial:"other"}),
                ability: new field.StringField(),
                misc: new field.StringField(),
                flavor: new field.StringField()
            }),
            gear: new field.EmbeddedDataField(Gear)
        }
    }
}