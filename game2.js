function Slot(x,y){
    this.x = x;
    this.y = y;
    this.realX=x*32;
    this.realY=y*32;
    this.entity= false;

    this.loadBrothers = function(){
        this.brotherBottom = this.parent.returnSlotByPosition(this.realX,this.realY+slotSize);
        this.brotherTop = this.parent.returnSlotByPosition(this.realX,this.realY-slotSize);
        this.brotherLeft = this.parent.returnSlotByPosition(this.realX-slotSize,this.realY);
        this.brotherRight = this.parent.returnSlotByPosition(this.realX+slotSize,this.realY);
        this.brothers = [
            this.brotherBottom,
            this.brotherLeft,
            this.brotherRight,
            this.brotherTop
        ]
    }

    this.grabEntity = function(){
        this.entity.x = this.realX;
        this.entity.y = this.realY;
        this.entity.parent = this;
    }

    this.dropEntity = function(){
        this.entity.grounted = false;
        let buffor = this.entity;
        this.entity = false;
        return buffor
    }

    this.checkBrothers = function(brotherSide,entityType){
        let result = {
            slots:[],
            points:0
        };
        let firstBrother = this[brotherSide];
        if(firstBrother){
            let secondBrother = firstBrother[brotherSide];

            if(firstBrother.entity){
                if(firstBrother.entity.type == entityType){

                    result.slots.push(firstBrother);
                    result.points ++;

                    if(secondBrother){
                        if(secondBrother.entity){
                            if(secondBrother.entity.type == entityType){
                                result.slots.push(secondBrother);
                                result.points ++;
                            }
                        }
                    }
                } 
            }
        }
       return result
    }

}

// Entity 
function Entity(startX,startY=0){
    this.y = startY;
    this.x = startX;
    this.type = fruits[Math.floor(Math.random() * (fruits.length))];
    this.grounted = false;
    this.parent;

    
    this.fall = function(){
        if(!this.grounted){
            this.y += 1.2;
            this.parent = map.returnSlotByPosition(this.x,this.y)

            if(!this.parent.brotherBottom){ // If on the end
                this.grounted = true;
            } 
            else if (this.parent.brotherBottom.entity){ // if other entity below
                this.grounted = true;
            }

            if(this.grounted){
                this.y = this.parent.realY;
                this.parent.entity = this;
            }
            let img = this.type;
            ctx.drawImage(img,this.x,this.y);
        }
    }

    


}

// Map surface counter
function countMapSurface(){
    let x = Math.floor( window.innerWidth/slotSize );
    let y = Math.floor( window.innerHeight/slotSize );
    if(x > 8) x = 8;
    if(y >= 14){
        y = 12;
    }
    else{
        y -= 2; // -2 to make space for the gamebar ;
    }

    if(y < 8){
        console.log("Screen to small but play if u wanna")
    }

    return {x:x-1,y:y-1}
}



//MAP Constructor
function Map(){
    this.slotsByAddress = {};
    this.allSlots = [];
    this.firstLine = [];
    let surface = countMapSurface();
    this.width = surface.x;
    this.height = surface.y;

    this.init = function(){
        Slot.prototype.parent = this;
        canvas.width = (this.width+1)*slotSize;
        canvas.height = (this.height+3)*slotSize;
        for(let x = 0; x<= this.width; x++){
            for(let y = 0; y<= this.height; y++){
                let newSlot = new Slot(x,y)
                this.slotsByAddress[`${x}:${y}`] = newSlot;
                this.allSlots.push(newSlot);
                if(y == 0){
                    this.firstLine.push(newSlot);
                }
            }
        }

        for(let slot of this.allSlots){
            slot.loadBrothers();
        }
    }

    this.refreshMap = function(){
        this.clearMap();
        this.renderMap();
    }

    this.clearMap = function(){
        ctx.clearRect(0,0,9*32,15*32);
    }

    this.renderMap = function(){
        ctx.strokeStyle = "#000";
        for(let slot of this.allSlots){

                if(slot.entity){
                    let img = slot.entity.type;
                    ctx.shadowColor = "black";
                    ctx.shadowOffsetY = 3;
                    ctx.shadowOffsetX = -3;
                    ctx.shadowBlur = 2;
                    ctx.drawImage(img,slot.realX,slot.realY,28,28);
                }
        }
    }

    this.fillSlots = function(){
        this.allSlots.forEach(slot => {
            slot.entity = new Entity();
            slot.grabEntity();
        });
    }
    

    this.returnSlotByPosition = function(realX,realY){
        let address = `${Math.floor(realX/slotSize)}:${Math.floor(realY/slotSize)}`;
        return this.slotsByAddress[address];  
    }

    
    this.init();
}

/** GAME
 *  Pseudo object to store game functions , selected slots & pause
 * 
*/

function Game(){
    this.paused = false;
    this.fallingEntities = [];
    this.firstSelected;
    this.secondSelected;

    this.startGame = function(){
        this.paused = false;
        map.fillSlots();
        map.renderMap();
        this.lookForConnections();
        this.gameLoop();
    }
    
    this.addEntities = function(){
        if(this.fallingEntities.length == 0){
            for(let slot of map.firstLine){
                if(!slot.entity){
                    let entity = new Entity(slot.realX,0);
                    this.fallingEntities.push(entity);
                }
            }
        }
    }

    this.liveEntites = function(){
        let landed = false;
        for(let i = 0; i < this.fallingEntities.length; i++){
            let entity = this.fallingEntities[i];
            entity.fall()
            if(entity.grounted){
                this.fallingEntities.splice(i,1);
                landed = true
            }
        }
        if(landed == true){
            this.lookForConnections();
            this.dropAllEntities();
        }
    }

    this.selectSlot = function(event){
        if(this.fallingEntities.length == 0){
            let selectedSlot = map.returnSlotByPosition(event.offsetX,event.offsetY);
            if(selectedSlot){
                if(!this.firstSelected && selectedSlot.entity){
                    this.firstSelected = selectedSlot
                }
                else if(this.firstSelected && selectedSlot.entity && this.firstSelected.brothers.includes(selectedSlot)){
                    this.secondSelected = selectedSlot
                    this.moveEntities();
                }
                else{
                    this.disselectAll();
                }
                this.focusSelected();
            }

        }

    }

    this.moveEntities = function(secondTime = false){
        let buffor = this.firstSelected.entity;
        this.firstSelected.entity = this.secondSelected.entity;
        this.secondSelected.entity = buffor;
        this.firstSelected.grabEntity();
        this.secondSelected.grabEntity();
        map.refreshMap();
        if(!this.lookForBombs(this.firstSelected,this.secondSelected)){

            if(this.lookForConnections() == false && secondTime == false){
                setTimeout(()=>{this.moveEntities(true)},500);
            }
            else{
                this.disselectAll();
            } 
        }
    }

    this.useBlaster = function(startSlot,blasterslot){
        let toremove = [startSlot,blasterslot];
        let lastSlot = startSlot;
        let type = startSlot.entity.type;
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#e1ff006d";
        ctx.beginPath();
        for(let slot of map.allSlots){
            if(slot.entity){
                if(slot.entity.type == type){
                    ctx.moveTo(lastSlot.realX+16,lastSlot.realY+16);
                    ctx.lineTo(slot.realX+16,slot.realY+16);
                    lastSlot = slot;
                    toremove.push(slot);
                }

            }
        }
        ctx.stroke();
        setTimeout((toremove)=>{
            this.clearSlots(toremove);
            this.dropAllEntities();
        },500,toremove)
    }

    this.getExplosionSurface = function(startSlot,power=false){
        ctx.fillStyle = "#ff000020";
        ctx.fillRect(startSlot.realX,startSlot.realY,32,32)
        result = {
            toDestroy:[startSlot],
            small:[],
            normal:[],
            havebombs:false
        }

        for(let brother of startSlot.brothers){
            if(brother){
                result.toDestroy.push(brother);
                if(power == true){
                    for(let secondBrother of brother.brothers){
                        if(secondBrother){
                            result.toDestroy.push(secondBrother);
                        }
                    }
                }
            }
        }

        return result
    }

    this.useBomb = function(startSlot,result){
        let buffor = [startSlot];
        for(let slot of result.toDestroy){
            if(slot.entity && slot != startSlot){
                if(slot.entity.type != blaster){
                    buffor.push(slot)
                }
                if(slot.entity.type == smallbomb){
                    result.small.push(slot);
                    result.havebombs = true;
                } 
                else if (slot.entity.type == bomb){
                    result.normal.push(slot);
                    result.havebombs = true;
                }
            }
            ctx.fillRect(slot.realX,slot.realY,32,32);
        }
        result.toDestroy = buffor;

        setTimeout((result)=>{
            this.clearSlots(result.toDestroy);
            if(result.havebombs == true){     
                for(let smallbomb of result.small){
                    this.useBomb(smallbomb,this.getExplosionSurface(smallbomb));
                }
                for(let bomb of result.normal){
                    this.useBomb(bomb,this.getExplosionSurface(bomb,true));
                }
                
            }
            else{
                this.dropAllEntities();
            }

            
        },500,result);
        
    }


    this.lookForBombs = function(slot1,slot2){
        let secondSlot = false;
        let foundedBomb = false;

        if(bombs.includes(slot1.entity.type)){
            foundedBomb = slot1;
            secondSlot = slot2;
        }
        else if(bombs.includes(slot2.entity.type)){
            foundedBomb = slot2;
            secondSlot = slot1;
        }
        else{
            return false
        }

        if(foundedBomb){
            if(foundedBomb.entity.type == blaster){
                this.useBlaster(secondSlot,foundedBomb);
            }
            else if (foundedBomb.entity.type == bomb){
                this.useBomb(foundedBomb,this.getExplosionSurface(foundedBomb,true))
            }
            else{
                this.useBomb(foundedBomb,this.getExplosionSurface(foundedBomb))
            }
        }

        return true
    }

    this.disselectAll = function(){
        this.firstSelected = false;
        this.secondSelected = false;
        map.refreshMap();
    }


    this.focusSelected = function(){
        if(this.firstSelected){
            ctx.clearRect(this.firstSelected.realX,this.firstSelected.realY,30,30);
            let img = this.firstSelected.entity.type;
            ctx.drawImage(img,this.firstSelected.realX,this.firstSelected.realY);
        }
        if(this.secondSelected){
            ctx.clearRect(this.secondSelected.realX,this.secondSelected.realY,30,30);
            let img = this.secondSelected.entity.type;
            ctx.drawImage(img,this.secondSelected.realX,this.secondSelected.realY);
        }
    }

    this.dropAllEntities = function(){
        for(let slot of map.allSlots){
            if(slot.brotherBottom){
                if(!slot.brotherBottom.entity){
                    let dropedEntity = slot.dropEntity();
                    if(dropedEntity){
                        this.fallingEntities.push(dropedEntity);
                    }
                }
            }
        }
    }

    

    this.lookForConnections = function(){
        let found = false;
        let toDestroy = [];
        let blasters = [];
        let bigBombs = [];
        let smallBombs = [];
        
        for(let slot of map.allSlots){
            if(slot.entity != false){
                let resultTop = slot.checkBrothers("brotherTop",slot.entity.type);
                let resultBottom = slot.checkBrothers("brotherBottom",slot.entity.type);
                let resultLeft = slot.checkBrothers("brotherLeft",slot.entity.type);
                let resultRight = slot.checkBrothers("brotherRight",slot.entity.type);
                let totalPoints = resultTop.points + resultBottom.points + resultLeft.points + resultRight.points;
                if(totalPoints == 6){
                    blasters.push({
                        slot:slot,
                        toDestroy:resultTop.slots.concat(resultBottom.slots,resultLeft.slots,resultRight.slots)
                    });       
                    found = true;
                }
                else if(totalPoints == 4 && resultTop.points != 1){
                    bigBombs.push({
                        slot:slot,
                        toDestroy:resultTop.slots.concat(resultBottom.slots,resultLeft.slots,resultRight.slots)
                    });
                    found = true;
                }
                else if(totalPoints >= 2){
                    if(resultTop.points + resultBottom.points == 4){
                        found = true;
                        bigBombs.push({
                            slot:slot,
                            toDestroy:resultTop.slots.concat(resultBottom.slots)
                        });
                    }
                    else if(resultLeft.points + resultRight.points == 4){
                        found = true;
                        bigBombs.push({
                            slot:slot,
                            toDestroy:resultLeft.slots.concat(resultRight.slots)
                        });
                    }
                    else if(resultTop.points + resultBottom.points == 3){
                        found = true;
                        smallBombs.push({
                            slot:slot,
                            toDestroy:resultTop.slots.concat(resultBottom.slots)
                        });
                    }
                    else if(resultLeft.points + resultRight.points == 3){
                        found = true;
                        smallBombs.push({
                            slot:slot,
                            toDestroy:resultLeft.slots.concat(resultRight.slots)
                        });
                    }
                    else if(resultLeft.points + resultRight.points == 2){
                        found = true;
                        toDestroy.push(slot,resultLeft.slots,resultRight.slots);
                    }
                    else if(resultTop.points + resultBottom.points == 2){
                        found = true;
                        toDestroy.push(slot,resultTop.slots,resultBottom.slots);
                    }
                }
            }
        }
        if(found){
            this.makeBombs(blasters,bigBombs,smallBombs,toDestroy);
        }
        return found
    }

    this.makeBombs = function(blasters,bigBombs,smallBombs,toDestroy){
        for(let data of blasters){
            data.slot.entity.type = blaster;
            this.clearSlots(data.toDestroy)
        }
        for(let data of bigBombs){
            if(data.slot.entity != false){
                data.slot.entity.type = bomb;
                this.clearSlots(data.toDestroy)
            }
        }
        for(let data of smallBombs){
            if(data.slot.entity != false){
                data.slot.entity.type = smallbomb;
                this.clearSlots(data.toDestroy)
            }
        }
        for(let toclear of toDestroy){
            if(toclear.entity){
                let type = toclear.entity.type;
                if(type != blaster && type != bomb && type != smallbomb){
                    toclear.entity = false;
                }
            }
        }
        game.dropAllEntities();
    }

    this.clearSlots = function(slots){
        for(let slot of slots){
                slot.entity = false; 
        }
    }

    this.gameLoop = function(){
        if(this.fallingEntities.length > 0){
            map.clearMap();
            this.liveEntites();
            map.renderMap();
        } else{
            this.addEntities();
        }
        
        if(!this.paused) setTimeout(this.gameLoop.bind(this));
    }


    canvas.addEventListener("mousedown",this.selectSlot.bind(this))
    document.getElementById("start-game-button").addEventListener("click",this.startGame.bind(this))
    document.getElementById("pause-game-button").addEventListener("click",()=>{this.paused = true})
}


//and menu functions:
let menuPagesMenager = {
    pages:{},
    activPage:undefined,

    showPage:function(pageName){
        console.log(pageName)
        let page = this.pages[pageName];
        if(page){
            this.activPage.classList.remove("game-menu-page-active");
            this.activPage = page;
            page.classList.add("game-menu-page-active");
        }
    },

    firstLoad:function(){
        for(let page of document.getElementsByClassName("game-menu-page")){
            let pageName = page.getAttribute("name");
            this.pages[pageName] = page;
            if(pageName == "game-load-page"){
                this.activPage = page;
            }
        }

        for(let button of document.getElementsByClassName("show-menu-page-button")){
            button.addEventListener("click",(e)=>{
                let value = e.target.value;
                this.showPage(value);
            })
        }
    }
}
menuPagesMenager.firstLoad();
// End of Functions
const canvas = document.getElementById("game-scene");
const slotSize = 32;
const blaster = document.getElementById("game-entity-blaster")
const bomb = document.getElementById("game-entity-bomb");
const smallbomb = document.getElementById("game-entity-smallbomb");
const bombs = [blaster,bomb,smallbomb];
let ctx = canvas.getContext("2d");
let fruits = [];
let map = new Map();
let game = new Game();
ctx.lineWidth = 2;
countMapSurface();

for(let img of document.getElementsByName("game-entity")){
    fruits.push(img)
}

window.onload = menuPagesMenager.showPage("main-page");