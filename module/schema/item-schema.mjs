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
            tons: new field.BooleanField({initial:false}),
            cost: new field.NumberField(),
            capital: new field.BooleanField({initial:false}),
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
            ranks: new field.NumberField(),
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
            minimized: new field.BooleanField({initial:false}),
            description: new field.StringField(),
            type: new field.StringField(),
            magazine: new field.SchemaField({
                loaded: new field.SchemaField({
                }),
                type: new field.StringField({initial:"internal"}),
                source: new field.StringField(),
                value: new field.NumberField({initial:0}),
                max: new field.NumberField({initial:0})
            }),
            range: new field.StringField({initial:"5ft"}),
            crit: new field.NumberField({initial:16}),
            error: new field.NumberField({initial:0}),
            weaponMods: new field.ObjectField(),
            actions: new field.ObjectField(),
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
            check: new field.StringField({initial:null,nullable:true}),
            effect: new field.StringField({initial:null,nullable:true}),
            recoil: new field.NumberField({initial:null,nullable:true}),
            cp: new field.NumberField({initial:null,nullable:true})
        }
    }
}
export class OpsAction  extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField({initial:'New Action'}),
            active: new field.BooleanField({initial:true}),
            check: new field.SchemaField({
                flavor: new field.StringField(),
                type: new field.StringField(), // melee,ranged vs skill,generic,otherUtility
                source: new field.StringField(),
                inherent: new field.StringField(),
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
            active: new field.BooleanField({initial:false}),
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
export class ResourceConsumable extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField(),
            type: new field.StringField({initial:'consumable'}),
            value: new field.NumberField(),
            max: new field.NumberField(),
            available: new field.BooleanField({initial:true})
        }
    }
}
export class ResourceCoolant extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField(),
            type: new field.StringField({initial:'coolant'}),
            value: new field.NumberField(),
            cool: new field.BooleanField({initial:true})
        }
    }
}
export class ResourceMagic extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField(),
            type: new field.StringField({initial:'magic'}),
            value: new field.NumberField(),
            max: new field.NumberField(),
            ml: new field.NumberField()
        }
    }
}
export class ResourceSpacecraft extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            name: new field.StringField(),
            type: new field.StringField({initial:'spacecraft'}),
            value: new field.NumberField(),
            payload: new field.StringField({initial:'standard'}),
            damage: new field.SchemaField({
                value: new field.StringField(),
                type: new field.StringField({initial:'ballistic'})
            }),
            hardness: new field.SchemaField({
                inherent: new field.NumberField()
            }),
            crit: new field.SchemaField({
                value: new field.NumberField({initial:16}),
                condition: new field.StringField()
            })
        }
    }
}
export class OpsObject extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            minimized: new field.BooleanField({initial:false}),
            description: new field.StringField(),
            gear: new field.EmbeddedDataField(Gear),
            actions: new field.ObjectField(),
            magazine: new field.SchemaField({
                type: new field.StringField({initial:'unlimited'}),
                source: new field.StringField()
            }),
            crit: new field.NumberField({initial:16})
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
            minimized: new field.BooleanField({initial:false}),
            description: new field.StringField(),
            actions: new field.ObjectField(),
            magazine: new field.SchemaField({
                type: new field.StringField({initial:'external'}),
                source: new field.StringField()
            })
        }
    }
}
export class OpsComponent extends foundry.abstract.DataModel{
    static defineSchema(){
        return{
            
        }
    }
}