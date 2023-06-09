const canvas = document.getElementById("game-scene");
const slotSize = 40;
const blaster = document.getElementById("game-entity-blaster")
const bomb = document.getElementById("game-entity-bomb");
const smallbomb = document.getElementById("game-entity-smallbomb");
const wall = document.getElementById("game-entity-wall");
const blocker = document.getElementById("game-entity-blocker");
const bombs = [blaster,bomb,smallbomb];
const noForConnect = [blaster,bomb,smallbomb,wall,blocker];

const ctx = canvas.getContext("2d");

let gamePaused = false;
let movingPaused = true;

let entities = [];
let fallingEntities = [];
let explosionAnimations = [];
let explosionAnimationFrames = [];

let movingEntities = false;
let firstSelected;
let secondSelected;

let map = new Map();

let audioPlayer = {
    audio1:new Audio('sounds/mixkit-arcade-game-explosion-2759.wav'),
    audio2:new Audio('sounds/success-fanfare-trumpets-6185.mp3'),
    audio3:new Audio('sounds/bad-explosion-6855.mp3'),
    audio4:new Audio('sounds/big-explosion-41783.mp3'),
    audio5:new Audio('sounds/short-success-sound-glockenspiel-treasure-video-game-6346.mp3'),
    audio6:new Audio('sounds/interface-124464.mp3'),
    audio7:new Audio('sounds/fail-144746.mp3'),

    normalizeVolume:function(){
        this.audio1.volume = .4;
        this.audio2.volume = .6;
        this.audio3.volume = .4;
        this.audio4.volume = .6;
        this.audio6.volume = .2;
    },
    
    playAudio:function(audioNumber){
        let audio = this[`audio${audioNumber}`];
        audio.currentTime = 0;
        audio.play()
    },
}

let scoreBoard = {
    movesDisplay:document.getElementById("display-moves"),
    goalBoxes:{},

    init:function(){
        for(let goalBox of document.getElementsByClassName("goal-box")){
            let name = goalBox.getAttribute("name");
            this.goalBoxes[name] = goalBox;
        }
    },

    hideAllGoals:function(){
        for(let name in this.goalBoxes){
            this.hideSingleGoal(name);
        }
    },


    hideSingleGoal:function(name){
        let box = this.goalBoxes[name];
        box.classList.remove("goal-box-active");
        let progressBar = box.querySelector("progress");
        progressBar.value = 0;
    },

    showGoalBoxes:function(goals){
        for(let name in goals){
            let maxValue = goals[name];
            let box = this.goalBoxes[name];
            let progressBar = box.querySelector("progress");
            progressBar.max = maxValue;
            box.classList.add("goal-box-active");
        }
    },

    updatePoint:function(name){
        let box = this.goalBoxes[name];
        let progressBar = box.querySelector("progress");
        progressBar.value++;
        if(progressBar.value >= progressBar.max){
            this.hideSingleGoal(name);
            return true
        }
    }
}

let levelsMenager = {
    counter:0,
    allLevels:{},
    actualGoals:[],
    selectLevelButtons:{},
    actual:0,
    moves:0,
    selected:false,
    nextLevel:1,

    createNew:function(moves,entities,specialFunctions,goals,fillAll = false){
        let newLevel = {
            moves:moves,
            entities:entities,
            specialFunctions:specialFunctions,
            goals:goals,
            fillAll:fillAll
        }
        this.allLevels[this.counter] = newLevel;
        this.counter++;
    },

    getData:function(param){
        let selected = this.allLevels[this.actual];
        return selected[param];
    },

    loadLevel:function(){
        scoreBoard.hideAllGoals();
        this.selected = this.allLevels[this.actual];
        this.moves = this.selected.moves;
        scoreBoard.movesDisplay.innerHTML = this.moves;
        this.loadGoals();
        map.fillSlots(this.selected.fillAll);
        this.selected.specialFunctions();
    },

    loadGoals:function(){
        this.actualGoals = [];
        for(let name in this.selected.goals){
            this.actualGoals.push(name);
        }
        scoreBoard.showGoalBoxes(this.selected.goals);
    },

    afterMove:function(){
        this.moves--;
        scoreBoard.movesDisplay.innerHTML = this.moves;
        if(this.moves < 0){
            gamePaused = true;
            audioPlayer.playAudio(7);
            menuPages.showPage("game-over");
        }
    },

    givePoint:function(goalName){
        if(this.actualGoals.includes(goalName)){
            if(scoreBoard.updatePoint(goalName)){
                audioPlayer.playAudio(5);
                let index = this.actualGoals.indexOf(goalName);
                this.actualGoals.splice(index, 1);
                if(this.actualGoals.length == 0){
                    this.gameWin();
                }
            }
        }
    },

    gameWin:function(){
        let msgBox = document.getElementById("after-win-message");
        audioPlayer.playAudio(2);
        disselectAll();
        scoreBoard.hideAllGoals();
        menuPages.showPage("winner-page");
        this.nextLevel = this.actual + 1;
        if(this.nextLevel <= 7){
            msgBox.innerHTML = `Unlocked level ${this.nextLevel+1}`;
            let button = this.selectLevelButtons[this.nextLevel];
            button.disabled = false;
        } else{
            msgBox.innerHTML = `Congratulations you pass final level !`;
        }
        setTimeout(()=>{gamePaused = true},500);
    }
}

let menuPages = {
    pages:{},
    activPage:undefined,

    showPage:function(pageName){
        let page = this.pages[pageName];
        if(page){
            this.activPage.classList.remove("game-menu-page-active");
            this.activPage = page;
            page.classList.add("game-menu-page-active");
            audioPlayer.playAudio(6)
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

    this.addEntity = function(type,code){
        this.entity = new Entity(this.realX,this.realY,{type:type,code:code})
    }

    this.dropEntity = function(){
        if(this.entity){
            if(this.entity.type != wall){
                this.entity.grounted = false;
                let buffor = this.entity;
                this.entity = false;
                return buffor
            } else{
                jumpOverWall(this);
            }
        }

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

function Entity(startX,startY=0,bytype){
    this.y = startY;
    this.x = startX;
    if(bytype){
        this.type = bytype.type;
        this.code = bytype.code;
    } 
    else{
        let random = Math.floor(Math.random() * levelsMenager.getData("entities"))
        this.type = entities[random];
        this.code = `enti-${random}`;
    }
    this.busy = false;
    this.grounted = false;
    this.parent;

    
    this.fall = function(){
        if(!this.grounted){
            
            this.y += 3;
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

    this.renderMap = function(slots = this.allSlots){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for(let slot of slots){
                if(slot.entity){
                    slot.entity.render();
                }
        }
    }

    this.fillSlots = function(fillAll){
        this.allSlots.forEach(slot => {
                slot.entity = false;
                if(fillAll) slot.entity = new Entity();
                slot.grabEntity();                

        });
    }
    

    this.returnSlotByPosition = function(realX,realY){
        let address = `${Math.floor(realX/slotSize)}:${Math.floor(realY/slotSize)}`;
        return this.slotsByAddress[address];  
    }

    
    this.init();
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
        document.getElementById("game-topbar").style.height = `${2*slotSize}px`;
    }

    return {x:x-1,y:y-1}
}   

function startGame(){
    movingEntities = false;
    explosionAnimations = [];
    fallingEntities = [];
    movingPaused = true;
    levelsMenager.loadLevel();
    lookForConnections();
    map.renderMap();
    setTimeout(()=>{
        movingPaused = false
        gamePaused = false;
        gameLoop();
    },1000);
}

function addEntities(){
    for(let slot of map.firstLine){
        if(!slot.entity){
            let entity = new Entity(slot.realX,0);
            fallingEntities.push(entity);
        }
    }
}

function entitiesGravity(){
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

function jumpOverWall(slot){
    let slotOnBottom = slot.brotherBottom;
    if(slotOnBottom){
        if(!slotOnBottom.entity){
            let brother = slot.brotherLeft;
            if(!brother){
                brother = slot.brotherRight;
            } 

            else if(brother.entity){
                if(brother.entity.type == wall){
                    brother = slot.brotherRight;
                }
            }             
            if(brother){
                if(brother.entity){
                    if(brother.entity.type != wall){
                        let dropedEntity = brother.entity;
                        brother.entity = false;
                        slot.brotherBottom.entity = dropedEntity;
                        slot.brotherBottom.grabEntity();
                        renderSlot(brother);
                        renderSlot(slotOnBottom);
                    }
                }
            }                               
        }
    }
}

function selectSlot(event){
    if(gamePaused == false && !movingPaused ){
        let selectedSlot = map.returnSlotByPosition(event.offsetX,event.offsetY);
        if(selectedSlot){
            if(selectedSlot.entity){

                if(selectedSlot.entity.busy == true || selectedSlot.entity.type == wall){
                    disselectAll();
                }

                else if(!firstSelected){
                    firstSelected = selectedSlot
                }

                else if(firstSelected.brothers.includes(selectedSlot)){
                    secondSelected = selectedSlot
                    startEntityMovment();
                    levelsMenager.afterMove();
                }
                else if (firstSelected == selectedSlot){
                    if(lookForBombs(firstSelected,selectedSlot)){
                        levelsMenager.afterMove();
                    } 
                    disselectAll();
                    
                }
                else{
                    disselectAll();
                }
                focusSelected();
            }

        }
    }
}

function startEntityMovment(firstTime = true){
    movingPaused = true;
    let buffor = {
        firstSlot:firstSelected,
        secondSlot:secondSelected,
        moveX: firstSelected.x - secondSelected.x,
        moveY: firstSelected.y - secondSelected.y,
        steps: slotSize,
        firstTime:firstTime,
    }
    movingEntities = buffor;
}

function animateEntityMovment(){
        let animation = movingEntities;
        if(animation.steps > 0){
            animation.steps -- ;
            let enti1 =  animation.firstSlot.entity;
            let enti2 = animation.secondSlot.entity;
            if(enti1 && enti2){
                enti1.x += animation.moveX * -1;
                enti1.y += animation.moveY * -1;
                enti2.x += animation.moveX;
                enti2.y += animation.moveY;
                enti1.render();
                enti2.render();
            }

        } 
        else if(animation.steps == 0){
            animation.steps -- ;
            replaceEntities(animation.firstSlot,animation.secondSlot)
            if(animation.firstTime){
                checkAfterMove(animation.firstSlot,animation.secondSlot)
            }
            else{
                movingEntities = false;
                disselectAll();
            }
        }

}

function checkAfterMove(firstSlot,secondSlot){
    if(!gamePaused){
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

}

function replaceEntities(firstSlot,secondSlot){
        if(firstSlot && secondSlot){
            let buffor = firstSlot.entity;
            firstSlot.entity = secondSlot.entity;
            secondSlot.entity = buffor;
            firstSlot.grabEntity();
            secondSlot.grabEntity();
            renderSlot(firstSlot);
            renderSlot(secondSlot);
        }
}

function disselectAll(){
    renderSlot(firstSelected);
    renderSlot(secondSelected);
    firstSelected = false;
    secondSelected = false;
    movingPaused = false;
}

function focusSelected(){
    if(firstSelected){

        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 3;
        ctx.shadowColor = "yellow";

        ctx.clearRect(firstSelected.realX,firstSelected.realY,slotSize,slotSize);
        let img = firstSelected.entity.type;
        ctx.drawImage(img,firstSelected.realX,firstSelected.realY,slotSize,slotSize);

    }
    if(secondSelected){

        ctx.clearRect(secondSelected.realX,secondSelected.realY,slotSize,slotSize);
        let img = secondSelected.entity.type;
        ctx.drawImage(img,secondSelected.realX,secondSelected.realY,slotSize,slotSize);

    }
    ctx.shadowColor = "transparent";
}

function countExplosionSurface(startSlot,power=false){
    audioPlayer.playAudio(3);
    startExplosionAnimation(startSlot,power)
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
        map.renderMap();
        focusSelected();
        dropAllEntities();
        
    },500,toremove)
}

function useBomb(startSlot,result){
    if(startSlot.entity.busy) return false
    startSlot.entity.busy = true;
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
        return false
    }
    else if(slot1.entity.type == slot2.entity.type && slot1.entity.type == blaster && slot1 != slot2){
        audioPlayer.playAudio(4);
        clearSlots(map.allSlots)
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
            useBlaster(secondSlot,foundedBomb);
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

function lookForConnections(){
    let found = false;
    let toDestroy = [];
    let blasters = [];
    let bigBombs = [];
    let smallBombs = [];
    
    for(let slot of map.allSlots){
        if(slot.entity != false){

            if(noForConnect.includes(slot.entity.type)) continue

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
            if(slot.entity.type != wall){
                ctx.drawImage(img,slot.realX+2,slot.realY+2,slotSize-4,slotSize-4);
            }
            else{
                ctx.drawImage(img,slot.realX,slot.realY,slotSize,slotSize);
            }
            
        }
    }


}

function makeSingleBomb(data,bomb){
    data.slot.entity.type = bomb;
    renderSlot(data.slot);
    clearSlots(data.toDestroy);
}

function makeBombs(blasters,bigBombs,smallBombs,toDestroy){
    for(let data of blasters){
        data.slot.entity.code = "blaster";
        makeSingleBomb(data,blaster)
    }

    for(let data of bigBombs){
        if(data.slot.entity != false){
            data.slot.entity.code = "bomb";
            makeSingleBomb(data,bomb)
        }
    }
    for(let data of smallBombs){
        if(data.slot.entity != false){
            data.slot.entity.code = "smallbomb";
            makeSingleBomb(data,smallbomb)
        }
    }
    for(let toclear of toDestroy){
        if(toclear.entity){
            let type = toclear.entity.type;
            if(type != blaster && type != bomb && type != smallbomb){
                levelsMenager.givePoint(toclear.entity.code)
                toclear.entity = false;
                renderSlot(toclear);
                startExplosionAnimation(toclear,1)
                audioPlayer.playAudio(1);
            }
        }
    }
    dropAllEntities();
}

function clearSlots(slots){
    audioPlayer.playAudio(1);
    for(let slot of slots){
        levelsMenager.givePoint(slot.entity.code)
        slot.entity = false; 
        ctx.clearRect(slot.realX,slot.realY,slotSize,slotSize);
        startExplosionAnimation(slot,1)
    }
}

function startExplosionAnimation(slot,power=2){
    if(power === true){
        power = 4;
        
    } else if(power === false){
        power = 2
    }
    let margin = (slotSize*power)/2;
    let startX = slot.realX - margin;
    let startY = slot.realY - margin
    let explosion = {
        x:startX,
        y:startY,
        size:(slotSize*power)+slotSize,
        margin:margin,
        step:0,
    }
    explosionAnimations.push(explosion); 

}

function animateExplosions(){
    if(explosionAnimations.length > 0){
        let inProgress = false;
        explosionAnimations.forEach(explosion =>{
            if(explosion.step <= explosionAnimationFrames.length-1){
                inProgress = true;
                let img = explosionAnimationFrames[explosion.step];
                ctx.drawImage(img,explosion.x,explosion.y,explosion.size,explosion.size);
            }
            explosion.step++;
        })
        if(!inProgress){
            explosionAnimations = [];
            map.renderMap();
            focusSelected();
        }
    }
}


function gameLoop(){
    if(fallingEntities.length > 0){
        entitiesGravity();
    } 
        
    else{
        addEntities();
    }
    animateEntityMovment();
    animateExplosions();

    if(!gamePaused) setTimeout(gameLoop.bind(this));
}

//Loading levels
(function(){

    let center_x = Math.ceil(map.width/2);
    let center_y = Math.ceil(map.height/2);

    let lvl1 = function(){
        map.allSlots.forEach((slot)=>{
            slot.addEntity(blocker,"blocker")
            if(slot.y == center_y){
                if(slot.x == 3 || slot.x == 4 || slot.x == 6){
                    slot.addEntity(entities[0],"enti-0");
                }
            }
        })
    };

    let lvl2 = function(){
        map.allSlots.forEach((slot)=>{
            slot.addEntity(blocker,"blocker");
            if(slot.x == center_x && slot.y == center_y){
                slot.addEntity(blaster,"blaster");
            }
        })
    };

    let lvl3 = function(){
        map.allSlots.forEach((slot)=>{
            let x = Math.ceil(map.width/2);
            if(slot.y == 3){
                slot.addEntity(wall,"wall");
            }
            else if(slot.y == 2 && slot.x == x){
                slot.addEntity(bomb,"bomb");
            }
        })
    };

    let lvl4 = function(){
        map.allSlots.forEach((slot)=>{
            if(slot.x%2 == 0){
                slot.addEntity(wall,"wall");
            } 
            else{
                if(slot.y == center_y-2 || slot.y == center_y+2){
                    slot.addEntity(bomb,"bomb")
                }
            }
        })
    };

    let lvl5 = function(){
        map.allSlots.forEach((slot)=>{
            if(slot.x == 0 || slot.x == map.width){
                if(slot.y%2 == 0){
                    slot.addEntity(wall,"wall");
                }
            } 
            else if(slot.x == 1 || slot.x == map.width-1){
                if(slot.y%2 == 0){
                    slot.addEntity(wall,"wall")
                }
            }
        })
    };

    let lvl6 = function(){
        map.allSlots.forEach((slot)=>{
            if(slot.x == center_x){
                slot.addEntity(wall,"wall");
            }
            else if(slot.x == center_x-1 && slot.y == center_y-1){
                slot.addEntity(bomb,"bomb");
            } 
        })
    }

    let lvl7 = function(){
        map.allSlots.forEach((slot)=>{
            if(slot.x == 0 || slot.x == map.width || slot.y == 0 || slot.y == map.height){
                slot.addEntity(blocker,"blocker");
            } 
        })
    }


    levelsMenager.createNew(1,5,lvl1,{"enti-0":3});
    levelsMenager.createNew(16,5,lvl2,{"enti-0":10,"enti-1":10,"enti-2":10});
    levelsMenager.createNew(13,6,lvl3,{"enti-0":13,"enti-1":13});
    levelsMenager.createNew(15,6,lvl4,{"enti-3":20},true);
    levelsMenager.createNew(16,5,lvl5,{"smallbomb":5});
    levelsMenager.createNew(15,7,lvl6,{"enti-5":13},true);
    levelsMenager.createNew(23,7,lvl7,{"enti-6":13},true);
    levelsMenager.createNew(30,5,()=>{},{"bomb":4});

}());


// Loading Rest of components 
(function(){

for(let img of document.getElementsByName("game-entity")){
    entities.push(img)
}

for(let img of document.getElementsByName("game-effect-bomb")){
    explosionAnimationFrames.push(img);
}

for(let button of document.getElementsByName("select-level")){
    levelsMenager.selectLevelButtons[parseInt(button.value)] = button;
    button.addEventListener("click",(e)=>{
        levelsMenager.actual = parseInt(e.target.value);
    })
}


audioPlayer.normalizeVolume();
menuPages.firstLoad();
scoreBoard.init();
canvas.addEventListener("mousedown",selectSlot);
document.getElementById("start-game-button").addEventListener("click",startGame);
document.getElementById("restart-game-button").addEventListener("click",startGame);
document.getElementById("retry-game-button").addEventListener("click",startGame);
document.getElementById("pause-game-button").addEventListener("click",()=>{gamePaused = true});
document.getElementById("resume-game-button").addEventListener("click",()=>{ gamePaused = false; gameLoop(); })
document.getElementById("nextlevel-game-button").addEventListener("click",()=>{
    setTimeout(()=>{
        levelsMenager.actual = levelsMenager.nextLevel;
        startGame();
    },500)
})
}());

//Loading loop
function loading(){
    if(document.readyState == "complete"){
        let startButton = document.getElementById("first-button");
        startButton.disabled = false;
        startButton.innerHTML = "Click to start";
    } else{
        setTimeout(loading,1000)
    }
}

loading();
