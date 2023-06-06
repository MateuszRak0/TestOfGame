let gamePaused = false;
let fallingEntities = [];
let movingEntities = false;
let firstSelected;
let secondSelected;
const canvas = document.getElementById("game-scene");
const slotSize = 36;
const blaster = document.getElementById("game-entity-blaster")
const bomb = document.getElementById("game-entity-bomb");
const smallbomb = document.getElementById("game-entity-smallbomb");
const bombs = [blaster,bomb,smallbomb];
let ctx = canvas.getContext("2d");
ctx.fillStyle = "green";
let fruits = [];
for(let img of document.getElementsByName("game-entity")){
    fruits.push(img)
}
let map = new Map();


function Slot(x,y){
    this.x = x;
    this.y = y;
    this.realX=x*slotSize;
    this.realY=y*slotSize;
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
        ctx.clearRect(this.realX,this.realY,slotSize,slotSize);
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
    this.type = fruits[Math.floor(Math.random() * (fruits.length - 2 ))];
    this.specialAbilities = false;
    this.grounted = false;
    this.parent;

    
    this.fall = function(){
        if(!this.grounted){
            
            this.y += 2;
            this.parent = map.returnSlotByPosition(this.x,this.y)

            if(!this.parent.brotherBottom){ this.grounted = true; } 
            else if (this.parent.brotherBottom.entity){ this.grounted = true;}

            if(this.grounted){
                this.y = this.parent.realY;
                this.parent.entity = this;
            }
            this.render();
        }
    }

    this.render = function(){
        let img = this.type;
        ctx.clearRect(this.x,this.y,slotSize,slotSize);
        ctx.drawImage(img,this.x+2,this.y+2,slotSize-4,slotSize-4);
    }

    


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

    this.clearMap = function(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    

    this.renderMap = function(slots = this.allSlots){
        for(let slot of slots){

                if(slot.entity){
                    slot.entity.render();
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

// Functions to games

function startGame(){
    map.clearMap();
    gamePaused = false;
    map.fillSlots();
    map.allSlots[20].entity.type = blaster;
    map.renderMap();
    lookForConnections();
    setTimeout(gameLoop,100)
}

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

function addEntities(){
    for(let slot of map.firstLine){
        if(!slot.entity){
            let entity = new Entity(slot.realX,0);
            fallingEntities.push(entity);
        }
    }
}


function liveEntites(){
    let landed = true;
    fallingEntities.forEach(entity=>{
        entity.fall()
        if(!entity.grounted){
            landed = false
        }
    })
    if(landed == true){
        fallingEntities = [];
        if(!lookForConnections()) dropAllEntities();
        
    }
}


function selectSlot(event){
    if(gamePaused == false){
        let selectedSlot = map.returnSlotByPosition(event.offsetX,event.offsetY);
        if(selectedSlot){
            if(!firstSelected && selectedSlot.entity){
                firstSelected = selectedSlot
            }
            else if(firstSelected && selectedSlot.entity && firstSelected.brothers.includes(selectedSlot)){
                secondSelected = selectedSlot
                startEntityMovment();
            }
            else if (firstSelected == selectedSlot){
                lookForBombs(firstSelected,selectedSlot);
                disselectAll();
            }
            else{
                disselectAll();
            }
            focusSelected();
        }
    }
}

function startEntityMovment(firstTime = true){
    let mover = {
        firstSlot:firstSelected,
        secondSlot:secondSelected,
        moveX: firstSelected.x - secondSelected.x,
        moveY: firstSelected.y - secondSelected.y,
        steps: slotSize,
        firstTime:firstTime,
    }
    movingEntities = mover;
}


function animateEntityMovment(){
        let animation = movingEntities;
        if(animation.steps > 0){
            animation.steps -- ;
            let enti1 =  animation.firstSlot.entity;
            let enti2 = animation.secondSlot.entity;
            enti1.x += animation.moveX * -1;
            enti1.y += animation.moveY * -1;
            enti2.x += animation.moveX;
            enti2.y += animation.moveY;
            enti1.render();
            enti2.render();
        } 
        else if(animation.steps == 0){
            animation.steps -- ;
            replaceEntities(animation.firstSlot,animation.secondSlot)
            if(animation.firstTime){
                checker(animation.firstSlot,animation.secondSlot)
            }
            else{
                movingEntities = false;
                disselectAll();
            }
        }

    }


function checker(firstSlot,secondSlot){
    if(!lookForBombs(firstSlot,secondSlot)){
        if(lookForConnections() == false){
            startEntityMovment(false);
        }
        else{
            disselectAll();
        }
    }
    else{
        disselectAll();
    }
}


function replaceEntities(firstSlot,secondSlot){
        let buffor = firstSlot.entity;
        firstSlot.entity = secondSlot.entity;
        secondSlot.entity = buffor;
        firstSlot.grabEntity();
        secondSlot.grabEntity();
        renderSlot(firstSlot);
        renderSlot(secondSlot);
}

function useBlaster(startSlot,blasterslot){
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
        clearSlots(toremove);
        map.clearMap();
        map.renderMap();
        dropAllEntities();
        
    },500,toremove)
}

function countExplosionSurface(startSlot,power=false){
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


function useBomb(startSlot,result){
    ctx.fillStyle = "#ff000020";
    ctx.fillRect(startSlot.realX,startSlot.realY,slotSize,slotSize)
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
        ctx.fillRect(slot.realX,slot.realY,slotSize,slotSize);
    }
    result.toDestroy = buffor;

    setTimeout((result)=>{
        clearSlots(result.toDestroy);
        if(result.havebombs == true){     
            for(let smallbomb of result.small){
                useBomb(smallbomb,countExplosionSurface(smallbomb));
            }
            for(let bomb of result.normal){
                useBomb(bomb,countExplosionSurface(bomb,true));
            }
            
        }
        else{
            dropAllEntities();
        }

        
    },500,result);
}    

function lookForBombs(slot1,slot2){
    let secondSlot = false;
    let foundedBomb = false;

    if(slot1 == slot2 && slot1.entity.type == blaster){
        useBomb(slot1,countExplosionSurface(slot1,true))
    }
    else if(bombs.includes(slot1.entity.type)){
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
            useBomb(foundedBomb,countExplosionSurface(foundedBomb,true))
        }
        else{
            useBomb(foundedBomb,countExplosionSurface(foundedBomb))
        }
    }

    return true
}

function disselectAll(){
    renderSlot(firstSelected);
    renderSlot(secondSelected);
    firstSelected = false;
    secondSelected = false;
}

function focusSelected(){
    if(firstSelected){
        ctx.clearRect(firstSelected.realX,firstSelected.realY,slotSize,slotSize);
        let img = firstSelected.entity.type;
        ctx.drawImage(img,firstSelected.realX,firstSelected.realY,slotSize,slotSize);
    }
    if(secondSelected){
        ctx.clearRect(secondSelected.realX,secondSelected.realY,slotSize,slotSize);
        let img = secondSelected.entity.type;
        ctx.drawImage(img,secondSelected.realX,secondSelected.realY,slotSize,slotSize);
    }
}

function dropAllEntities(){
    for(let slot of map.allSlots){
        if(slot.brotherBottom){
            if(!slot.brotherBottom.entity){
                let dropedEntity = slot.dropEntity();
                if(dropedEntity){
                    fallingEntities.push(dropedEntity);
                }
            }
        }
    }
}

function lookForConnections(){
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
            if(totalPoints >= 2){
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
                else{
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
    }
    if(found){
        makeBombs(blasters,bigBombs,smallBombs,toDestroy);
    }
    return found
}

function renderSlot(slot){
    if(slot){
        ctx.clearRect(slot.realX,slot.realY,slotSize,slotSize);
        if(slot.entity){
            let img = slot.entity.type;
            ctx.drawImage(img,slot.realX+2,slot.realY+2,slotSize-4,slotSize-4);
        }
    }


}


function makeBombs(blasters,bigBombs,smallBombs,toDestroy){
    for(let data of blasters){
        data.slot.entity.type = blaster;
        renderSlot(data.slot);
        clearSlots(data.toDestroy);
    }
    for(let data of bigBombs){
        if(data.slot.entity != false){
            data.slot.entity.type = bomb;
            renderSlot(data.slot);
            clearSlots(data.toDestroy);
        }
    }
    for(let data of smallBombs){
        if(data.slot.entity != false){
            data.slot.entity.type = smallbomb;
            renderSlot(data.slot);
            clearSlots(data.toDestroy);
        }
    }
    for(let toclear of toDestroy){
        if(toclear.entity){
            let type = toclear.entity.type;
            if(type != blaster && type != bomb && type != smallbomb){
                toclear.entity = false;
                renderSlot(toclear);
            }
        }
    }
    dropAllEntities();
}

function clearSlots(slots){
    for(let slot of slots){
        slot.entity = false; 
        ctx.clearRect(slot.realX,slot.realY,slotSize,slotSize);
}
}

function gameLoop(){
    if(fallingEntities.length > 0){
        liveEntites();
    } 
        

    else{
        addEntities();
    }
    animateEntityMovment();
    if(!gamePaused) setTimeout(gameLoop.bind(this));
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
window.onload = menuPagesMenager.showPage("main-page");
canvas.addEventListener("mousedown",selectSlot)
document.getElementById("start-game-button").addEventListener("click",startGame)
document.getElementById("pause-game-button").addEventListener("click",()=>{gamePaused = true})
document.getElementById("resume-game-button").addEventListener("click",()=>{
    gamePaused = false;
    gameLoop();
})




