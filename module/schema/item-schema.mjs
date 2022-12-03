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
            focus: new field.StringField({initial:"unfocus"}),
            ability: new field.StringField({initial:"int"}),
            ranks: new field.NumberField({initial:0}),
            armor: new field.BooleanField({initial:false}),
            skillMods: new field.ArrayField(
                new field.EmbeddedDataField(SkillMod)
            )
        }
    };
};
export class SkillMod extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField({initial:"Source"}),
            type: new field.StringField({initial:"misc"}),
            value: new field.NumberField({initial:0,positive:false}),
            active: new field.BooleanField({initial:true})
        }
    }
}
export class OpsArmor extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            description: new field.StringField(),
            layer: new field.NumberField({initial:1}),
            active: new field.BooleanField({initial:false}),
            def: new field.SchemaField({
                value: new field.NumberField({initial:0}),
                active: new field.BooleanField({initial:true})
            }),
            agiMax: new field.SchemaField({
                value: new field.NumberField({nullable:true,initial:null}),
                active: new field.BooleanField({initial:true})
            }),
            penalty: new field.SchemaField({
                value: new field.NumberField({initial:0}),
                active: new field.BooleanField({initial:true})
            }),
            cpLoss: new field.SchemaField({
                value: new field.NumberField({initial:0}),
                active: new field.BooleanField({initial:true})
            }),
            protection: new field.ArrayField(
                new field.EmbeddedDataField(Protection),
                {initial:[]}
            ),
            dr: new field.NumberField({initial:0}),
            ap: new field.SchemaField({
                value: new field.NumberField({initial:0}),
                max: new field.NumberField({initial:0})
            }),
            proficient: new field.StringField({initial:"Untrained"}),
            gear: new field.EmbeddedDataField(Gear)
        }
    }
};
export class Protection extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField({initial:"None"}),
            value: new field.NumberField({initial:0})
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
            weaponMods: new field.ArrayField(
                new field.EmbeddedDataField(WeaponMod),
                {initial:[]}
            ),
            attacks: new field.ArrayField(
                new field.EmbeddedDataField(Attack),
                {initial:[new Attack]}
            ),
            gear: new field.EmbeddedDataField(Gear)
        }
    }
}
export class WeaponMod extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField({initial:"Source"}),
            description: new field.StringField(),
            hit: new field.NumberField({initial:0}),
            damage: new field.StringField({initial:""}),
            recoil: new field.NumberField({initial:0}),
            cp: new field.NumberField({initial:0})
        }
    }
}
export class SelectMod extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            hitCheck: new field.BooleanField({initial:false}),
            damageCheck: new field.BooleanField({initial:false}),
            recoilCheck: new field.BooleanField({initial:false}),
            cpCheck: new field.BooleanField({initial:false})
        }
    }
}
export class Attack extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField({initial:"Attack"}),
            description: new field.StringField(),
            inherent: new field.SchemaField({
                hit: new field.NumberField({initial:0}),
                damage: new field.StringField({initial:""}),
                recoil: new field.NumberField({initial:0}),
                cp: new field.NumberField({initial:0})
            }),
            abilities: new field.SchemaField({
                hitAbility: new field.StringField(),
                damageAbility: new field.StringField()
            }),
            display: new field.BooleanField({initial:true}),
            ammo: new field.NumberField({initial:0}),
            totals: new field.SchemaField({}),
            showMods: new field.BooleanField({initial:true}),
            modSelection: new field.ArrayField(
                new field.EmbeddedDataField(SelectMod),                
                {initial:[]}
            )
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