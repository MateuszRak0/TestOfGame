const canvas = document.getElementById("game-scene");
const slotSize = 40;
const blaster = document.getElementById("game-entity-blaster")
const bomb = document.getElementById("game-entity-bomb");
const smallbomb = document.getElementById("game-entity-smallbomb");
const bombs = [blaster,bomb,smallbomb];

let audio1 = new Audio('mixkit-arcade-game-explosion-2759.wav');
let gamePaused = false;
let movingPaused = true;
let fallingEntities = [];
let explosionAnimations = [];
let movingEntities = false;
let lastSelected = false;
let firstSelected;
let secondSelected;
let ctx = canvas.getContext("2d");
let fruits = [];
let explosionAnimationFrames = [];
let map = new Map();

const scoreBoard = {
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

let level = {
    allLevels:[],
    actual:0,
    moves:0,
    selected:false,
    actualGoals:[],
    levelsButtons:{},

    createNew:function(moves,entities,specialFunctions,goals){
        let newLevel = {
            moves:moves,
            entities:entities,
            specialFunctions:specialFunctions,
            goals:goals
        }
        this.allLevels.push(newLevel);
    },

    getData:function(param){
        let selected = this.allLevels[this.actual];
        return selected[param];
    },

    loadLevel:function(){
        scoreBoard.hideAllGoals();
        this.selected = this.allLevels[this.actual];
        this.moves = this.selected.moves;
        this.selected.specialFunctions();
        scoreBoard.movesDisplay.innerHTML = this.moves;
        this.loadGoals();
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
            scoreBoard.hideAllGoals();
            menuPagesMenager.showPage("game-over");
        }
    },

    givePoint:function(goalName){
        if(this.actualGoals.includes(goalName)){
            if(scoreBoard.updatePoint(goalName)){
                let index = this.actualGoals.indexOf(goalName);
                this.actualGoals.splice(index, 1);
                if(this.actualGoals.length == 0){
                    this.gameover();
                }
            }
        }
    },

    gameover:function(){
        let nextLevelButton = this.levelsButtons[this.actual+1];
        if(nextLevelButton){
            nextLevelButton.disabled = false;
        }
        gamePaused = true;
        scoreBoard.hideAllGoals();
        menuPagesMenager.showPage("winner-page");
    }
}

let menuPagesMenager = {
    pages:{},
    activPage:undefined,

    showPage:function(pageName){
        let page = this.pages[pageName];
        if(page){
            this.activPage.classList.remove("game-menu-page-active");
            this.activPage = page;
            page.classList.add("game-menu-page-active");
        }
    },

    firstLoad:function(){
        scoreBoard.init();

        for(let img of document.getElementsByName("game-entity")){
            fruits.push(img)
        }
        
        for(let img of document.getElementsByName("game-effect-bomb")){
            explosionAnimationFrames.push(img);
        }

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

        for(let button of document.getElementsByName("select-level")){
            level.levelsButtons[button.value] = button;
            button.addEventListener("click",(e)=>{
                level.actual = e.target.value;
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
    let random = Math.floor(Math.random() * level.getData("entities"))
    this.type = fruits[random];
    this.code = `enti-${random}`;
    this.specialAbilities = false;
    this.grounted = false;
    this.parent;

    
    this.fall = function(){
        if(!this.grounted){
            
            this.y += 1.8;
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
    movingPaused = true;
    map.clearMap();
    gamePaused = false;
    map.fillSlots();
    level.loadLevel();
    lookForConnections();
    map.renderMap();
    gameLoop();
    setTimeout(()=>{movingPaused = false},3000);
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
    if(gamePaused == false && !secondSelected && !movingPaused ){
        let selectedSlot = map.returnSlotByPosition(event.offsetX,event.offsetY);
        if(selectedSlot){
            if(!firstSelected && selectedSlot.entity){
                firstSelected = selectedSlot
            }
            else if(firstSelected && selectedSlot.entity && firstSelected.brothers.includes(selectedSlot)){
                secondSelected = selectedSlot
                startEntityMovment();
                level.afterMove();
            }
            else if (firstSelected == selectedSlot){
                if(lookForBombs(firstSelected,selectedSlot)){
                    level.afterMove();
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

function startEntityMovment(firstTime = true){
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
                checker(animation.firstSlot,animation.secondSlot)
            }
            else{
                movingEntities = false;
                disselectAll();
            }
        }

}


function checker(firstSlot,secondSlot){
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


function useBomb(startSlot,result){
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
                level.givePoint(toclear.entity.code)
                toclear.entity = false;
                renderSlot(toclear);
                startExplosionAnimation(toclear,1)
            }
        }
    }
    dropAllEntities();
}

function clearSlots(slots){
    for(let slot of slots){
        level.givePoint(slot.entity.code)
        slot.entity = false; 
        ctx.clearRect(slot.realX,slot.realY,slotSize,slotSize);
        startExplosionAnimation(slot,1)
}
}


function startExplosionAnimation(slot,power=2){
    audio1.currentTime = 0;
    audio1.play();
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
            if(explosion.step < 75){
                inProgress = true;
                let img = explosionAnimationFrames[explosion.step];
                ctx.drawImage(img,explosion.x,explosion.y,explosion.size,explosion.size);
            }
            explosion.step++;
        })
        if(!inProgress){
            explosionAnimations = [];
            map.clearMap();
            map.renderMap();
        }
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
    animateExplosions();

    if(!gamePaused) setTimeout(gameLoop.bind(this));
}

// Final Loading

level.createNew(20,5,function(){map.allSlots[40].entity.type=blaster;},{"enti-3":13});
level.createNew(10,5,function(){},{"enti-0":30,"enti-1":30});
level.createNew(10,6,function(){},{"enti-0":30});
level.createNew(10,6,function(){},{"enti-0":30,"enti-1":30});
level.createNew(10,7,function(){},{"enti-0":30,"enti-1":30});
level.createNew(10,7,function(){},{"enti-0":30,"enti-1":30});
level.createNew(10,8,function(){},{"enti-0":30,"enti-1":30});
level.createNew(23,8,function(){},{"enti-0":30,"enti-1":30});

menuPagesMenager.firstLoad();
window.onload = menuPagesMenager.showPage("main-page");
canvas.addEventListener("mousedown",selectSlot)
document.getElementById("start-game-button").addEventListener("click",startGame)
document.getElementById("pause-game-button").addEventListener("click",()=>{gamePaused = true})
document.getElementById("resume-game-button").addEventListener("click",()=>{
    gamePaused = false;
    gameLoop();
})




