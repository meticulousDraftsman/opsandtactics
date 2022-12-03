export async function roll3d6(data={parts:[]},options){
    if(data.rollType!='message'){
        let formula = [];
        if(data.rollType=='attack'||data.rollType=='check') formula.push("3d6");
        formula.push(data.parts);
        formula = formula.join('+');
        if(formula=="") formula="0"
        const roll = new ThreeD6Roll(formula,data);
        const rolls = [];
        const poppedUp = await roll.rollPopup(data)
        if(poppedUp===null)return null;
        rolls.push(await poppedUp.evaluate({async:true}));
        if(data.missChange && data.missChance!= 0) rolls.push(await ThreeD6Roll.create(`1d100cs>${data.missChance}[Miss Chance]`).evaluate({async:true}))
        //console.debug(rolls)
        ChatMessage.create({
            type:data.type,
            speaker:data.speaker,
            flavor:data.flavor,
            sound: CONFIG.sounds.dice,
            rolls: rolls
        },
        options)
    }
    else{
        ChatMessage.create({
            type:data.type,
            speaker:data.speaker,
            flavor:data.flavor,
            content:data.content
        })
    }
    return data;
}

export class ThreeD6Roll extends Roll{
    static get name() {return "Roll"}

    get isCritical(){
        if(!this._evaluated) return undefined;
        if(!Number.isNumeric(this.options.crit)) return false;
        return this.dice[0].total >= this.options.crit;
    }

    async toMessage(messageData={}, options={}){
        if(!this._evaluated) await this.evaluate({async:true});
        return super.toMessage(messageData,options)
    }

    async rollPopup(data){
        //if(data.rollType=='other') return this;
        let template = `systems/opsandtactics/templates/chat/dialog-${data.rollType}.html`;
        const content = await renderTemplate(template,{
            formula: this.formula,
            atkType:"Ranged",
            atkFlank:0,
            atkHigh:false,
            atkStance:0,
            atkSeen:false,
            atkFace:0,
            defStance:0,
            defStun:false,
            defClimb:false,
            defPin:false,
            defCover:"",
            sitBon:"",
            ammo:""
        });

        return new Promise(resolve => {
            new Dialog({
                title: data.flavor,
                content,
                buttons: {
                    roll: {
                        label: "Roll",
                        callback: html => resolve(this._submitPopup(html,data))
                    }
                },
                close: () => resolve(null)
            }).render(true,{width:520});
        });
    }

    async _submitPopup(html,data){
        const form = html[0].querySelector("form");
        
        if(data.rollType=='attack'){
            if(form.ammo.value!="") data.ammo=Number(form.ammo.value)
            let atkBon = 0;
            atkBon += Number(form.atkFlank.value);
            atkBon -= Number(form.atkFace.value);
            if(form.atkSeen.value==true) atkBon +=2;
            atkBon += Number(form.atkStance.value);
            if(form.atkType.value == "melee"){
                atkBon -= (Number(form.atkStance.value)*3);
                if(form.atkHigh.value==true) atkBon +=1;
            } 
            let defBon = 0;
            let missChance = 0;
            if(form.defStun.value==true) defBon -= 2;
            if(form.defClimb.value==true) defBon -= 2;
            defBon += Number(form.defStance.value);
            if(form.atkType.value=="melee"){
                if(form.defStance.value!=="0") defBon -= 6;
                if(form.defPin.value==true) defBon -= 4;
            }
            switch(form.defCover.value){
                case "cov0":
                    break;
                case "cov1":
                    defBon += 3;
                    break;
                case "cov2":
                    defBon += 6;
                    missChance = 10;
                    break;
                case "cov3":
                    defBon += 9
                    missChance = 20;
                    break;
                case "cov4":
                    defBon += 15
                    missChance = 30;
                    break;
                case "10":
                    missChance = 10;
                    break;
                case "20":
                    missChance = 20;
                    break;
                case "30":
                    missChance = 30;
                    break;
                case "40":
                    missChance = 40;
                    break;
                case "50":
                    missChance = 50;
                    break;
            }
            defBon *= -1;
            if(atkBon!=0){
                const attacker = new Roll(atkBon.toString(),this.data);
                //console.debug(attacker)
                if(!(attacker.terms[0] instanceof OperatorTerm)) this.terms.push(new OperatorTerm({operator:"+"}));
                this.terms = this.terms.concat(attacker.terms);
            }
            if(defBon!=0){
                const defender = new Roll(defBon.toString(),this.data);
                //console.debug(defender)
                if(!(defender.terms[0] instanceof OperatorTerm)) this.terms.push(new OperatorTerm({operator:"+"}));
                this.terms = this.terms.concat(defender.terms);
            }
            data.missChance = missChance;
            if(form.atkType.value=="message") data.rollType = 'message';
        }
        if(form.sitBon.value){
            const situation = new Roll(form.sitBon.value,this.data);
            //console.debug(situation)
            if(!(situation.terms[0] instanceof OperatorTerm)) this.terms.push(new OperatorTerm({operator:"+"}));
            this.terms = this.terms.concat(situation.terms);
        }
        
        this._formula = this.constructor.getFormula(this.terms);
        
        
        //data.content = await this.render({async:true});
        //if (missChance!=0) data.content += await new Roll(`1d100cs>=${missChance}`).render({async:true,flavor:"Miss Chance"});;

        return this;
    }
}