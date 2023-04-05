const field = foundry.data.fields;

class Gear extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            quantity: new field.SchemaField({
                value: new field.NumberField({initial:1}),
                available: new field.BooleanField({initial:false})
            }),
            size: new field.StringField({initial:""}),
            weight: new field.NumberField(),
            cost: new field.NumberField(),
            quality: new field.StringField(),
            restriction: new field.StringField(),
            physical: new field.BooleanField({initial:true}),
            location: new field.SchemaField({
                parent: new field.StringField({initial:"Loose"}),
                note: new field.StringField()
            }),
            resources: new field.ObjectField()
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
                max: new field.NumberField({initial:0,nullable:false})
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
            crit: new field.NumberField({initial:16}),
            error: new field.NumberField({initial:0}),
            weaponMods: new field.ObjectField(),
            attacks: new field.ObjectField(),
            selectMod: new field.StringField(),
            importFilter: new field.StringField(),
            importMod: new field.StringField(),
            gear: new field.EmbeddedDataField(Gear)
        }
    }
}
export class WeaponMod extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField({nullable:false}),
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
            active: new field.BooleanField({initial:true}),
            display: new field.BooleanField({initial:true}),
            type: new field.StringField({initial:'ranged'}),
            ammo: new field.NumberField(),
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
export class OpsAction  extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField(),
            active: new field.BooleanField({initial:true}),
            check: new field.SchemaField({
                flavor: new field.StringField(),
                type: new field.StringField(), // melee,ranged,otherAttack vs skill,generic,otherUtility
                source: new field.StringField(),
                inherent: new field.NumberField(),
                ability: new field.StringField()
            }),
            effect: new field.SchemaField({
                flavor: new field.StringField(),
                inherent: new field.StringField(),
                ability: new field.StringField()
            }),
            ammo: new field.NumberField(),
            cp: new field.SchemaField({
                inherent: new field.NumberField()
            })
        }
    }
}
export class WeaponAttack extends OpsAction{
    static defineSchema(){
        const schema = super.defineSchema();
        schema.display = new field.BooleanField({initial:true});
        schema.check.fields = mergeObject(
            schema.check.fields,{
                mods: new field.ObjectField()
            }
        );
        schema.effect.fields = mergeObject(
            schema.check.fields,{
                mods: new field.ObjectField(),
                scaleAbility: new field.NumberField({initial:1})
            }
        );
        schema.recoil = new field.SchemaField({
            inherent: new field.NumberField({initial:null, nullable:true}),
            mods: new field.ObjectField()
        });
        schema.cp.fields = mergeObject(
            schema.cp.fields,{
                mods: new field.ObjectField()
            }
        );
        return schema;
    }
}
export class OpsObject extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            description: new field.StringField(),
            gear: new field.EmbeddedDataField(Gear),
            actions: new field.ObjectField(),
            magazine: new field.SchemaField({
                type: new field.StringField({initial:'unlimited'}),
                source: new field.StringField()
            })
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