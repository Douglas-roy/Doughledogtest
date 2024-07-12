import pgnClass from './pgn.js';
const board = document.getElementById('board');
const canvas = document.getElementById('canvas');
const moveInput = document.getElementById('moveInput');
const resignButton = document.getElementById('resignButton');
const drawButton = document.getElementById('drawButton');
const flipButton = document.getElementById('flipButton');
canvas.width = window.innerWidth; 
canvas.height = window.innerHeight;
board.width = canvas.width * .70; //Adjust to css
const ctx = canvas.getContext('2d');

//Board to keep track of squares and stuff
class Board{
    constructor (){
        this.squareBoard = Array(8).fill(null).map(() => Array(8).fill(null));
        this.highlightedSquare = null;
        this.redHighlightedSquares = new Set();
        this.arrowSet=new Map;
        this.possiList=new Set();
        this.kings=["74","04"]//White black
        this.kingMoved=[false,false];
        this.turn=true; //White=true;
        this.promoPiece=null;
        this.enPassantable=null;
        this.moveNote="";
        this.moveNumber=1;
        this.gameOver=false;
        this.flip=false;
        this.boardPositions = {}; //for threefold
        this.rookMoved=new Set();

    }
    print(){
        for(let i=0;i<8;i++){
            console.log(this.squareBoard[i]);
        }
        console.log("\n");
    }
}

//Listeners for the textfield
moveInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') { 
      handleTextInput();
    }
});
moveInput.addEventListener('input', function(event) {
    // Remove the 'invalid-input' class when the user starts typing
    if (event.key != 'Enter') { 
        moveInput.classList.remove('invalid-input');
      }
});

//Event listener to flip board
flipButton.addEventListener('click',function(){
    board.classList.toggle('flip-board');
    const pieces = document.querySelectorAll('.piece');
    pieces.forEach(piece => {
        //keep the piece right-side-up
        piece.classList.toggle('flip-board');
    });
    game.flip=!game.flip;
    window.dispatchEvent(new Event('resize'));

});
//Function that allows text input in Algebraic Notation along with normal input
function handleTextInput(){
    let result=moveParse(moveInput.value);
    let prev=game.highlightedSquare;
    if(result==null||game.gameOver){
        moveInput.classList.add('invalid-input');
        document.getElementById('parseSound').play()
        return;
    }
    let maybe=null;
    const color=game.turn?"w":"b";
    for(let i=0; i<=7;i++){
        for(let j=0;j<=7;j++){
            if(game.squareBoard[i][j].dataset.piece[1]==result.piece&&color==game.squareBoard[i][j].dataset.piece[0]){
                game.highlightedSquare=game.squareBoard[i][j];
                possibleMoves(game.highlightedSquare);
                if (game.possiList.has(result.destination[0]+""+result.destination[1])){
                    const potential=game.highlightedSquare.dataset;
                    if(result.disamR+result.disamF==""||result.disamR+result.disamF==potential.chess+potential.chessC){
                        maybe=game.highlightedSquare;
                        break;
                    }else if(result.disamF==potential.chess||result.disamR==potential.chessC){
                        maybe=game.highlightedSquare;
                    }
                }
            }
        }
    }
    const clickEvent = new MouseEvent('mousedown', {button: 0, });   
    game.highlightedSquare=prev;
    if(maybe!=null){
        if(game.highlightedSquare!=maybe){
            maybe.dispatchEvent(clickEvent);
        }
        game.squareBoard[result.destination[0]][result.destination[1]].dispatchEvent(clickEvent);
        moveInput.value = '';
        const color=!game.turn?"w":"b";
        const overlay=!game.turn?document.getElementById("promotionOverlayW"):document.getElementById("promotionOverlayB");
        
        if(overlay.style.display=="block" && result.promotion!=""){
            const piece=color+result.promotion[1];
            const selector=`#promotionOverlay${color.toUpperCase()} .promotion-option[data-piece="${piece}"]`;
            const select=document.querySelector(selector);
            select.click();
        }

    }else{
        moveInput.classList.add('invalid-input');
        document.getElementById('illegalSound').play()
    }
    
}
//Function to parse text input
function moveParse(input){
    if (input === 'O-O') {
        const way=game.turn?[7,6]:[0,6];
        return {
            piece: 'K',
            destination:way,
            disamF:'',
            disamR: '',
            additional: '',
            promotion:  ''

        };
    } else if (input === 'O-O-O') {
        const way=game.turn?[7,2]:[0,2];
        return {
            piece: 'K',
            destination:way,
            disamF:'',
            disamR: '',
            additional: '',
            promotion:  ''

        };
    }
    const regex = /^([KQRNBP]?)([a-h]?)([1-8]?)(x?)([a-h])([1-8])((=[QRNB])?)([+#]?)/;

    if (!input.match(regex)) {
        return null; //bad input
    }
    const [, piece, disamF, disamR, capture, file, rank,  promotion ,additional] = input.match(regex);
    const col = file.charCodeAt(0)-97;
    const row = 8 - Number(rank); 
    return{
        piece: piece || 'P',
        destination: [row, col],
        capture: capture === 'x',
        additional: additional || '',
        promotion: promotion || '',
        disamF: disamF ||'',
        disamR: disamR ||''
    }


}
//Event listener to resign
resignButton.addEventListener('click', function() {
    pgnBuilder.updateRes(Number(!game.turn));
    showPopup(2);
    pgnBuilder.display();
    resignButton.style.display="none";
    drawButton.style.display="none";
    endSidelog();

});
//Event listener to draw
drawButton.addEventListener('click', function() {
    pgnBuilder.updateRes(-1);
    showPopup(3);
    pgnBuilder.display();
    resignButton.style.display="none";
    drawButton.style.display="none";
    endSidelog();

});
//Pop-up for ending
function showPopup(type) {
    const popupContainer = document.getElementById('popupContainer');
    let popupTitle = document.getElementById('popupTitle');
    if(type==1){//Stalemate
        popupTitle.textContent ="Stalemate";
    }else if(type==2){//resign
        popupTitle.textContent ="Resignation";
    }else if(type==3){//draw
        popupTitle.textContent ="Draw";
    }else if(type==4){//Threefold
        popupTitle.textContent ="Threefold Repetition";
    }
    popupContainer.style.display = 'flex';
    resignButton.style.display="none";
    drawButton.style.display="none";
    game.gameOver=true;
    document.getElementById('endSound').play();

}

// Function to hide the pop-up
function hidePopup() {
    const popupContainer = document.getElementById('popupContainer');
    popupContainer.style.display = 'none';
}

// Event listener for the refresh button
refreshButton.addEventListener('click', function() {
    location.reload(); // Refresh the page
});
// Event listener for the close button
closeButton.addEventListener('click', function() {
    hidePopup(); 
});
  
function handleContextMenu(event) {
    event.preventDefault();
}

// Function to draw an arrow from one square to another
function drawArrow(fromPos, toPos) {
    // Calculate arrow coordinates
    const arrowWidth = ((board.width>700)?700:board.width )/ 40; // Arrow width (adjust as needed)
    const arrowHeadLength = arrowWidth * 3; // Arrowhead length
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const angle = Math.atan2(dy, dx);
    const arrowStart = {
        x: fromPos.x + fromPos.width/2,
        y: fromPos.y + fromPos.width/2,
    };
    const arrowEnd = {
        x: toPos.x + fromPos.width/2,
        y: toPos.y + fromPos.width/2
    };
    ctx.globalAlpha = 0.7; 
    // Draw arrow line
    ctx.beginPath();
    ctx.moveTo(arrowStart.x, arrowStart.y);
    ctx.lineTo(arrowEnd.x, arrowEnd.y);
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = arrowWidth;
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(arrowEnd.x - (arrowHeadLength * Math.cos(angle - Math.PI / 6)), arrowEnd.y - (arrowHeadLength * Math.sin(angle - Math.PI / 6)));
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(arrowEnd.x - (arrowHeadLength * Math.cos(angle + Math.PI / 6)), arrowEnd.y - (arrowHeadLength * Math.sin(angle + Math.PI / 6)));
    ctx.stroke();
    ctx.globalAlpha = 1.0;
}
//Function to draw circle in square for potential moves.
function drawCircle(pos) {
    ctx.beginPath();
    let centerX = pos.x +pos.width/ 2;
    let centerY = pos.y +pos.height / 2;
    if(!pos.piece){//Regular move
        ctx.arc(centerX, centerY, .175*pos.width, 0, 2 * Math.PI);

    }else{ //Capture
        ctx.arc(centerX, centerY, .500*pos.width, 0, 2 * Math.PI,false);
        ctx.arc(centerX, centerY, .400*pos.width, 0, 2 * Math.PI,true);

    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();

    ctx.closePath();
}
// Add event listener for the context menu event
document.addEventListener('contextmenu', handleContextMenu);
//Hashing board positions
function crc32(str) {
    let crc = 0xffffffff;
    for (let i = 0; i < str.length; i++) {
        let charCode = str.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
            if ((crc ^ charCode) & 1) {
                crc = (crc >>> 1) ^ 0xedb88320;
            } else {
                crc >>>= 1;
            }
            charCode >>>= 1;
        }
    }
    return (crc ^ 0xffffffff) >>> 0; // Convert to unsigned 32-bit integer
}
//Checks for 3 fold
function isThreefoldRepetition() {
    let squares = document.querySelectorAll('.square');
    let string="";
    squares.forEach(square => {
        let outerHtml = square.dataset.piece;
        string+=outerHtml;
    });
    let currentPosition = crc32(string+JSON.stringify(game.kingMoved));
    if (!game.boardPositions[currentPosition]) {
        game.boardPositions[currentPosition] = 1;
    } else {
        game.boardPositions[currentPosition]++;
    }
    return game.boardPositions[currentPosition] >= 3;
}
function soundControl(moveNotation){
    let sound=document.getElementById('moveSound');
    for(let i=moveNotation.length; i>0;i--){
        if(moveNotation[i]=="x"){
            sound=document.getElementById('captureSound');
        }else if(moveNotation[i]=="O"){
            sound=document.getElementById('castleSound');
            break;
        }else if(moveNotation[i]=="+"||moveNotation[i]=="#"){
            sound=document.getElementById('checkSound');
            break;
        }else if(moveNotation[i]=="="){
            sound=document.getElementById('promoteSound');
            break;
        }
    }
    sound.play();

}
// Function to update the side log with a new move notation
function updateSideLog(moveNotation) {
    const sideLog = document.getElementById('sideLog');
    const newMove = document.createElement('div');
    newMove.textContent = moveNotation;

    // Check if there are existing rows in the side log
    const rows = sideLog.querySelectorAll('.row');
    let lastRow = null;
    if (rows.length === 0 || rows[rows.length - 1].children.length === 3) {
        // If no rows or the last row is full, create a new row
        lastRow = document.createElement('div');
        lastRow.classList.add('row');
        if(game.moveNumber%2){ //Color shift
            lastRow.classList.add('shade');
        }
        sideLog.appendChild(lastRow);
        const number = document.createElement('div');
        number.textContent = game.moveNumber+".";
        lastRow.appendChild(number);
        pgnBuilder.updateGame(game.moveNumber+". ");
        game.moveNumber++;
    } else {
        lastRow = rows[rows.length - 1];
    }

    lastRow.appendChild(newMove);
    pgnBuilder.updateGame(moveNotation+" ");
    sideLog.scrollTop = sideLog.scrollHeight;
    
    if (isThreefoldRepetition()) {
        pgnBuilder.updateRes(-1);
        showPopup(4); 
    }
    soundControl(moveNotation);//sounds
    let x=window.getComputedStyle(sideLog).getPropertyValue('max-height');
    let y=window.getComputedStyle(board).getPropertyValue('width');
    sideLog.style.maxHeight=y;

}
//Update sidelog with result
function endSidelog(){
    const sideLog = document.getElementById('sideLog');
    const newMove = document.createElement('div');
    newMove.textContent = pgnBuilder.result;
    let lastRow = document.createElement('div');
    lastRow.classList.add('row');
    if(game.moveNumber%2){ //Color shift
        lastRow.classList.add('shade');
    }
    lastRow.style.gridTemplateColumns='2fr 1fr 2fr';
    sideLog.appendChild(lastRow);
    const blank= document.createElement('div');
    lastRow.appendChild(blank);
    lastRow.appendChild(newMove);
    sideLog.scrollTop = sideLog.scrollHeight;

}
//Functions to handle square clicks
function squareMouseDownHandler(event)  {
    let square=event.currentTarget;
    if (event.button===0){//Left click
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.arrowSet.clear();
        game.redHighlightedSquares.forEach(function(element) {
            element.classList.remove('highlighted-red');
        });
        game.redHighlightedSquares.clear();
        if(game.enPassantable!=null&&game.enPassantable[1]==0){
            game.enPassantable=null;
        }
        game.promoPiece=null;
        if (square.classList.contains('highlighted-yellow')) { //Highlight cancel
            square.classList.remove('highlighted-yellow');
            game.highlightedSquare = null;
            game.possiList.clear();
        } else {
            if(game.possiList.has(square.dataset.row+square.dataset.col)){//Move
                let ret=movePiece(game.highlightedSquare,square);
                game.highlightedSquare.classList.remove('highlighted-yellow');
                square.classList.add('highlighted-yellow');
                game.highlightedSquare=square;
                game.possiList.clear();
                game.turn=!game.turn;
                if(game.enPassantable!=null){
                    game.enPassantable[1]--;
                }
                if (ret!=4){
                    //console.log(moveNote);
                    updateSideLog(game.moveNote);
                    if(pgnBuilder.result!=""){//game over
                        pgnBuilder.display();
                        endSidelog();
                    }   
                }
                

            }else{//Different square highlight
                if (game.highlightedSquare !== null) {
                    game.highlightedSquare.classList.remove('highlighted-yellow');
                }
                square.classList.add('highlighted-yellow');
                game.highlightedSquare = square;
                highlightedPrint();
                let color=game.turn?"w":"b";
                if(game.highlightedSquare.dataset.piece[0]==color&&!game.gameOver){
                    pieceOnSquare(game.highlightedSquare);
                    displayPossi();
                    
                }else{
                    game.possiList.clear(); 
                }
                
            }
            
        }
    }else{//Right click (down)
        if (game.highlightedSquare !== null) {
            game.highlightedSquare.classList.remove('highlighted-yellow');
        }
        if(game.possiList.size!==0){
            game.possiList.clear();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        game.highlightedSquare = square;
        //highlightedPrint();

    }
}
function squareMouseUpHandler(event) {
    let square=event.currentTarget;
    if(event.button===0||game.highlightedSquare==null){
        return;
    }
    if (game.highlightedSquare==square){
        //Cancel highlight (red)
        if (square.classList.contains('highlighted-red')) {
            square.classList.remove('highlighted-red');
            game.redHighlightedSquares.delete(square);
        } else {
            square.classList.add('highlighted-red');
            game.redHighlightedSquares.add(square);
        }
    }else {
        //Draw arrow
        let highlightedSquare=game.highlightedSquare;
        let startPos=getSquarePosition(highlightedSquare);
        const endPos = getSquarePosition(square);
        if(game.arrowSet.has(square2Chess(highlightedSquare)+square2Chess(square))){
            game.arrowSet.delete(square2Chess(highlightedSquare)+square2Chess(square));
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            game.arrowSet.forEach(arrow => {
                drawArrow(getSquarePosition(arrow.highlightedSquare), getSquarePosition(arrow.square));
            });
            return;
        }
        game.arrowSet.set(square2Chess(highlightedSquare)+square2Chess(square),{highlightedSquare,square});
        drawArrow(startPos, endPos);
        game.highlightedSquare=square;
        //highlightedPrint();
        game.highlightedSquare=null;
        startPos=null;
    }

}

// Function to create squares
function createSquare(row, col) {
    const square = document.createElement('div');
    square.classList.add('square');
    if ((row + col) % 2 === 0) {
        square.classList.add('light');
    } else {
        square.classList.add('dark');
    }
    square.dataset.row = row;
    square.dataset.col = col;
    square.dataset.chess=square2Chess(square)[0];//file
    square.dataset.chessC=square2Chess(square)[1];//rank
    square.dataset.piece = "x";

    square.addEventListener('mousedown', squareMouseDownHandler);
    square.addEventListener('mouseup', squareMouseUpHandler);
    
    return square;
}
// Function to get the position of a square
function getSquarePosition(square) {
    const rect = square.getBoundingClientRect();
    let piece=(square.dataset.piece!="x");
    return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        piece: piece
    };

}
// Function to resize window
window.addEventListener('resize', () => {
    const sideLog = document.getElementById('sideLog');
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    board.width=canvas.width *.70;
    sideLog.style.maxHeight=window.getComputedStyle(board).getPropertyValue('width');//fix sidelog
    game.arrowSet.forEach(arrow => { //Fix arrows
        drawArrow(getSquarePosition(arrow.highlightedSquare), getSquarePosition(arrow.square));
    });
    game.possiList.forEach(possi => { //Fix circles
        drawCircle(getSquarePosition(game.squareBoard[possi[0]][possi[1]]));
    });
    let overlay = null;
    if (!game.turn ) {
        overlay = document.getElementById("promotionOverlayW");   
    } else  {
        overlay = document.getElementById("promotionOverlayB");
    }
    if (overlay!=null&&overlay.style.display === "block") { //Fix promotion overlay
        closePromotionOverlay(processPromo);
        game.turn=!game.turn;
        openPromotionOverlay(game.highlightedSquare);
        game.turn=!game.turn;
    }


});
//Helper to print highlighted square (unneeded)
function highlightedPrint(){
    const letter = String.fromCharCode('a'.charCodeAt(0) + Number(game.highlightedSquare.dataset.col));
    const number = (8 - game.highlightedSquare.dataset.row).toString();
    console.log(letter+number);
}
//Function to convert a square to chess square notation
function square2Chess(square){
    const letter = String.fromCharCode('a'.charCodeAt(0) + Number(square.dataset.col));
    const number = (8 - square.dataset.row).toString();
    return(letter+number);
}
// Function to create the board
function createBoard() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = createSquare(row, col);
            board.appendChild(square);
            game.squareBoard[row][col]=square;
            placePieces(square,row,col);
        }

    }
}
//Function to place piece pngs on board at start
function placePieces(square,row,col){
    if(row>1&&row<6){
        return;
    }
    if(row==6){
        place(square,'https://cdn.jsdelivr.net/gh/Douglas-roy/Doughledogtest@main/pieces/wPawn.png');
        square.dataset.piece="wP";
    }else if(row==1){
        place(square,'https://cdn.jsdelivr.net/gh/Douglas-roy/Doughledogtest@main/pieces/bPawn.png');
        square.dataset.piece="bP";
    }else{
        let color=row?"w":"b";
        switch(col){
            case 0:
            case 7://rooks
                place(square,'https://cdn.jsdelivr.net/gh/Douglas-roy/Doughledogtest@main/pieces/${color}Rook.png');
                square.dataset.piece=color+"R";
                break;
            case 1:
            case 6://knights
                place(square, 'https://cdn.jsdelivr.net/gh/Douglas-roy/Doughledogtest@main/pieces/${color}Knight.png');
                square.dataset.piece=color+"N";
                break;
            case 2:
            case 5: //bishops
                place(square, 'https://cdn.jsdelivr.net/gh/Douglas-roy/Doughledogtest@main/pieces/${color}Bishop.png`);
                square.dataset.piece=color+"B";
                break;
            case 3: //queen
                place(square, 'https://cdn.jsdelivr.net/gh/Douglas-roy/Doughledogtest@main/pieces/${color}Queen.png');
                square.dataset.piece=color+"Q";
                break;
            default: //king
                place(square, `https://cdn.jsdelivr.net/gh/Douglas-roy/Doughledogtest@main/pieces/${color}King.png`);
                square.dataset.piece=color+"K";
        }
    } 
    
}
//Function to place an individual piece
function place(square, pieceSrc) {
    let piece = document.createElement('div');
    piece.classList.add('piece');
    if(game.flip){
        piece.classList.add('flip-board');
    }
    piece.style.backgroundImage = `url(${pieceSrc})`;
    if(square.lastChild!=null){
        square.removeChild(square.lastChild);
    }
    square.appendChild(piece);
    
}
//Function that returns the piece on a square and updates the possiList
function pieceOnSquare(square){
    let piece=square.dataset.piece;
    if(square.childNodes[square.childNodes.length-1] && square.childNodes[square.childNodes.length-1].classList.contains('piece')){
        if((game.turn==true&&piece[0]=='w')||(game.turn==false&&piece[0]=='b')){possibleMoves(square)};
        return piece;
    }
    return null;
}
//Function that updates the possiList with legal moves
function possibleMoves(square){
    let piece=square.dataset.piece;
    game.possiList.clear();
    if (piece==null){   
        return;
    }
    let row=Number(square.dataset.row);
    let col=Number(square.dataset.col);
    if(piece[1]=='P'){//Pawn
        
        let diff=(piece[0]=='w')?-1:1;
        if(((col+1)<=7)&&!(piece[0]+"x").includes(game.squareBoard[row+diff][col+1].dataset.piece[0])){//right capture;
            game.possiList.add((row+diff)+""+(col+1));
        }
        if(((col-1)>=0)&&!(piece[0]+"x").includes(game.squareBoard[row+diff][col-1].dataset.piece[0])){//left capture;
            game.possiList.add((row+diff)+""+(col-1));
        }
        if(game.squareBoard[row+diff][col].dataset.piece=="x"){//single square move
            game.possiList.add((row+diff)+""+col);
            if (((piece[0]=='w'&&row==6)||(piece[0]=='b'&&row==1))&&(game.squareBoard[row+diff*2][col].dataset.piece=="x")){//two square move
                game.possiList.add((row+(diff*2))+""+col);     
            }
        }  
        if(col+1<=7&&game.enPassantable!=null&&game.squareBoard[row][col+1]==game.enPassantable[0]){//en Passants
            game.possiList.add((row+(diff))+""+(col+1));   
        }     
        if(col-1>=0&&game.enPassantable!=null&&game.squareBoard[row][col-1]==game.enPassantable[0]){
            game.possiList.add((row+(diff))+""+(col-1));   
        }  
    }else if(piece[1]=='N'){    //Knight
        let base=[2,1];
        let shift=true;
        for(let i=0;i<4;i++){//2 then 1
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            if(!(vert>7||vert<0||hori>7||hori<0)){
                if(game.squareBoard[vert][hori].dataset.piece[0]!=piece[0]){
                    game.possiList.add((vert)+""+(hori));
                }
            }
            vert=(row+base[1]);
            hori=(col+base[0]);
            if(!(vert>7||vert<0||hori>7||hori<0)){//1 then 2
                if(game.squareBoard[vert][hori].dataset.piece[0]!=piece[0]){
                    game.possiList.add((vert)+""+(hori));
                }
            }
            base[Number(shift)]=-1*base[Number(shift)];
            shift=!shift;
        }
    }else if (piece[1]=='B'){//Bishop
        let base=[1,1];
        let shift=true; 
        for(let i=0;i<4;i++){//all directions
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            while(true){
                if(!(vert>7||vert<0||hori>7||hori<0)){
                    if(game.squareBoard[vert][hori].dataset.piece[0]=="x"){//empty
                        game.possiList.add((vert)+""+(hori));
                    }else if(game.squareBoard[vert][hori].dataset.piece[0]!=piece[0]){//capture
                        game.possiList.add((vert)+""+(hori));
                        break;
                    }else{
                        break;
                    }
                }else{
                    break;
                }
                vert= (vert+base[0]);
                hori=(hori+base[1]);
            }
            base[Number(shift)]=-1*base[Number(shift)];
            shift=!shift;
        }   
    }else if (piece[1]=='R'){//Rook
        let base=[0,1];
        let shift=true;
        for(let i=0;i<4;i++){//all directions
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            while(true){
                if(!(vert>7||vert<0||hori>7||hori<0)){
                    if(game.squareBoard[vert][hori].dataset.piece[0]=="x"){//empty
                        game.possiList.add((vert)+""+(hori));
                    }else if(game.squareBoard[vert][hori].dataset.piece[0]!=piece[0]){//capture
                        game.possiList.add((vert)+""+(hori));
                        break;
                    }else{
                        break;
                    }
                }else{
                    break;
                }
                vert= (vert+base[0]);
                hori=(hori+base[1]);
            }
            if(i==1){
                [base[0],base[1]]=[base[1],base[0]];
                shift=!shift;
            }
            base[Number(shift)]=-1*base[Number(shift)];
        } 
    }else if (piece[1]=='K'){ //King
        let base=[1,1];
        let shift=true;
        for(let i=0;i<4;i++){//diag
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            if(!(vert>7||vert<0||hori>7||hori<0)){
                if(game.squareBoard[vert][hori].dataset.piece[0]!=piece[0]){
                    game.possiList.add((vert)+""+(hori));
                }
            }
            base[Number(shift)]=-1*base[Number(shift)];
            shift=!shift;
        }
        base=[0,1];
        shift=true;
        for(let i=0;i<4;i++){//vert/hori
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            if(!(vert>7||vert<0||hori>7||hori<0)){
                if(game.squareBoard[vert][hori].dataset.piece[0]!=piece[0]){
                    game.possiList.add((vert)+""+(hori));
                }
            }
            if(i==1){
                [base[0],base[1]]=[base[1],base[0]];
                shift=!shift;
            }
            base[Number(shift)]=-1*base[Number(shift)];
           
        }
        //castle
        if(!game.kingMoved[Number(!game.turn)]){
            for (let i=1;i<=3;i++){
                if(i<=2&&game.squareBoard[row][col+i].dataset.piece!="x"){
                    break;
                }else if(i==3&&game.squareBoard[row][col+i].dataset.piece[1]=="R"&&
                        !game.rookMoved.has(row+""+(col+i))){
                    game.possiList.add((row)+""+(col+2));
                }
            }
            for (let i=1;i<=4;i++){
                if(i<=3&&game.squareBoard[row][col-i].dataset.piece!="x"){
                    break;
                }else if(i==4&&game.squareBoard[row][col-i].dataset.piece[1]=="R"&&
                        !game.rookMoved.has(row+""+(col-i))){
                    game.possiList.add((row)+""+(col-2));
                }
            }
        }
        
        

    }else{//Queen
        let base=[0,1];
        let shift=true;
        for(let i=0;i<4;i++){//vert/hori
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            while(true){
                if(!(vert>7||vert<0||hori>7||hori<0)){
                    if(game.squareBoard[vert][hori].dataset.piece[0]=="x"){//empty
                        game.possiList.add((vert)+""+(hori));
                    }else if(game.squareBoard[vert][hori].dataset.piece[0]!=piece[0]){//capture
                        game.possiList.add((vert)+""+(hori));
                        break;
                    }else{
                        break;
                    }
                }else{
                    break;
                }
                vert= (vert+base[0]);
                hori=(hori+base[1]);
            }
            if(i==1){
                [base[0],base[1]]=[base[1],base[0]];
                shift=!shift;
            }
            base[Number(shift)]=-1*base[Number(shift)];
        } 
        base=[1,1];
        shift=true; 
        for(let i=0;i<4;i++){//diag
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            while(true){
                if(!(vert>7||vert<0||hori>7||hori<0)){
                    if(game.squareBoard[vert][hori].dataset.piece[0]=="x"){//empty
                        game.possiList.add((vert)+""+(hori));
                    }else if(game.squareBoard[vert][hori].dataset.piece[0]!=piece[0]){//capture
                        game.possiList.add((vert)+""+(hori));
                        break;
                    }else{
                        break;
                    }
                }else{
                    break;
                }
                vert= (vert+base[0]);
                hori=(hori+base[1]);
            }
            base[Number(shift)]=-1*base[Number(shift)];
            shift=!shift;
        }  

    }

    pinCheckLook(game.kings[Number(!game.turn)],true);//filter further


}
/**Filters the possiList for pinned pieces or for check.
 * 
 * A true condition means the real king position
 * A false condition means looking where king cant go
 */

function pinCheckLook (position,condition){ 
    let row = Number(position[0]);
    let col=Number(position[1]);
    let type=game.turn?'w':'b';
    let defensePiece=null;
    let attackPiece=null;
    //If piece is king, just follow "in check" logic
    if(game.highlightedSquare.dataset.piece[1]=='K'&&condition){ 
        forced(null);
        return;
    }

    //Look for checks/pins from Queen/Rook
    let base=[0,1];
    let shift=true;
    for(let i=0;i<4;i++){//vert/hori
        let vert= (row+base[0]);
        let hori=(col+base[1]);
        defensePiece=null;
        attackPiece=null;
        while(true){
            if(!(vert>7||vert<0||hori>7||hori<0)){
                if(game.squareBoard[vert][hori].dataset.piece[0]=="x"){//empty
                    
                }else if(game.squareBoard[vert][hori].dataset.piece[0]!=type){//possible check
                    attackPiece=game.squareBoard[vert][hori];
                    break;
                }else{//possible pin
                    if(defensePiece!=null){
                        break;
                    }
                    defensePiece=game.squareBoard[vert][hori].dataset.piece[1]!='K'?game.squareBoard[vert][hori]:null;
                }
            }else{
                break;
            }
            vert= (vert+base[0]);
            hori=(hori+base[1]);
        }
        
        if(defensePiece!=null&&attackPiece!=null&&"QR".includes(attackPiece.dataset.piece[1])&&game.highlightedSquare==defensePiece){
            pinLogic(attackPiece,0);
        }else if(defensePiece==null&&attackPiece!=null&&"QR".includes(attackPiece.dataset.piece[1])){
            if(condition){
                checkLogic(attackPiece,0);
            }else{
                return true;
            }
        }
        if(i==1){
            [base[0],base[1]]=[base[1],base[0]];
            shift=!shift;
        }
        base[Number(shift)]=-1*base[Number(shift)];
    } 

    //Look for checks/pins from Queen/Bishop
    base=[1,1];
    shift=true;
    for(let i=0;i<4;i++){//diag
        defensePiece=null;
        attackPiece=null;
        let vert= (row+base[0]);
        let hori=(col+base[1]);
        while(true){
            if(!(vert>7||vert<0||hori>7||hori<0)){
                if(game.squareBoard[vert][hori].dataset.piece[0]=="x"){
                    
                }else if(game.squareBoard[vert][hori].dataset.piece[0]!=type){
                    attackPiece=game.squareBoard[vert][hori];
                    break;
                }else{
                    if(defensePiece!=null){
                        break;
                    }
                    defensePiece=game.squareBoard[vert][hori].dataset.piece[1]!='K'?game.squareBoard[vert][hori]:null;
                }
            }else{
                break;
            }
            vert= (vert+base[0]);
            hori=(hori+base[1]);
        }
        if(defensePiece!=null&&attackPiece!=null&&"QB".includes(attackPiece.dataset.piece[1])&&game.highlightedSquare==defensePiece){
            pinLogic(attackPiece,1);
        }else if(defensePiece==null&&attackPiece!=null&&"QB".includes(attackPiece.dataset.piece[1])){
            if(condition){
                checkLogic(attackPiece,1);
            }else{
                return true;
            }
        }
        base[Number(shift)]=-1*base[Number(shift)];
        shift=!shift;

    }

    //Knight check
    base=[2,1];
    shift=true;
    for(let i=0;i<4;i++){//all directions
        let vert= (row+base[0]);
        let hori=(col+base[1]);
        if(!(vert>7||vert<0||hori>7||hori<0)){
            if(game.squareBoard[vert][hori].dataset.piece[0]!=type&&
                    game.squareBoard[vert][hori].dataset.piece[1]=='N'){
                if(condition){
                    checkLogic(game.squareBoard[vert][hori],0);
                    break;
                }else{
                    return true;
                }            
            }
        }
        vert=(row+base[1]);
        hori=(col+base[0]);
        if(!(vert>7||vert<0||hori>7||hori<0)){
            if(game.squareBoard[vert][hori].dataset.piece[0]!=type&&
                    game.squareBoard[vert][hori].dataset.piece[1]=='N'){
                if(condition){
                    checkLogic(game.squareBoard[vert][hori],0);
                    break;
                }else{
                    return true;
                }   
            }
        }
        base[Number(shift)]=-1*base[Number(shift)];
        shift=!shift;
    }

    //Pawn check
    let diff=(game.turn)?-1:1;
    if(((col+1)<=7)&&((row+diff)>0)&&(row+diff)<=7){
        if((game.squareBoard[row+diff][col+1].dataset.piece[0]!=type&&
                game.squareBoard[row+diff][col+1].dataset.piece[1]=='P')){
            if(condition){
                checkLogic(game.squareBoard[row+diff][col+1],0);
            }else{
                return true;
            }
            
        }
    }
     if(((row+diff)<=7)&&((col-1)>=0)&&((row+diff)>0)){
        if(game.squareBoard[row+diff][col-1].dataset.piece[0]!=type&&
                game.squareBoard[row+diff][col-1].dataset.piece[1]=='P'){
            if(condition){
                checkLogic(game.squareBoard[row+diff][col-1],0);
            }else{
                return true;
            }
        }
    }

    //Prevents kings from getting close to eachother
    if(!condition){
        let base=[1,1];
        let shift=true;
        for(let i=0;i<4;i++){//diag
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            if(!(vert>7||vert<0||hori>7||hori<0)){
                if(game.squareBoard[vert][hori].dataset.piece[0]!=type&&
                        game.squareBoard[vert][hori].dataset.piece[1]=='K' ){
                    return true;
                }
            }
            base[Number(shift)]=-1*base[Number(shift)];
            shift=!shift;
        }
        base=[0,1];
        shift=true;
        for(let i=0;i<4;i++){//vert/hori
            let vert= (row+base[0]);
            let hori=(col+base[1]);
            if(!(vert>7||vert<0||hori>7||hori<0)){
                if(game.squareBoard[vert][hori].dataset.piece[0]!=type&&
                        game.squareBoard[vert][hori].dataset.piece[1]=='K' ){
                    return true;
                }
            }
            if(i==1){
                [base[0],base[1]]=[base[1],base[0]];
                shift=!shift;
            }
            base[Number(shift)]=-1*base[Number(shift)];
           
        }
    }
    return false;   
}

//Function to determine what moves are possible during check
function checkLogic(attackPiece,type){
    let piece=game.highlightedSquare.dataset.piece;
    if(attackPiece.dataset.piece[1]=='N'||attackPiece.dataset.piece[1]=='P'||piece[1]=='K'){
        forced(attackPiece); //must capture piece or move
    }
    else {
        pinLogic(attackPiece,type);//must put a piece inbetween or capture;
    }
}

//Function to filter possiList during check
function forced(attackPiece){
    let piece=game.highlightedSquare.dataset.piece;
    let newSet = new Set();
    if(piece[1]!='K'){ //Can you capture?
        game.possiList.forEach(possi => {
            if(possi[0]==attackPiece.dataset.row&&possi[1]==attackPiece.dataset.col){
                newSet.add(possi);
            }
        });
    }else{  //move king (checking legal moves)
        game.possiList.forEach(possi => {
            if(!pinCheckLook(possi,false)){
                newSet.add(possi);
            }
            
        });
        if(!game.kingMoved[Number(!game.turn)]){//quick way for castle through/during check
            if(pinCheckLook(game.highlightedSquare.dataset.row+""+game.highlightedSquare.dataset.col,false)){
                newSet.delete("76");
                newSet.delete("72");
                newSet.delete("02");
                newSet.delete("06");
            }
            if((newSet.has("76")&&!newSet.has("75"))){//prevent castle through check
                newSet.delete("76");
            }if((newSet.has("72")&&!newSet.has("73"))){
                newSet.delete("72");
            }if((newSet.has("02")&&!newSet.has("03"))){
                newSet.delete("02");
            }if((newSet.has("06")&&!newSet.has("05"))){
                newSet.delete("06");
            }
        }
        
    }
    game.possiList=newSet;
}

//Function to filter possiList during a pin
//Also filters possiList to break a check
function pinLogic(attackPiece,type){ //type 0= diag, type 1=row/col

    let row=attackPiece.dataset.row;
    let col=attackPiece.dataset.col;
    let kingRow=game.kings[Number(!game.turn)][0];
    let kingCol=game.kings[Number(!game.turn)][1];
    let newSet = new Set();
    game.possiList.forEach(possi => {
        //Diagonal pin
        if(type&&(Math.abs(possi[0]-row)==Math.abs(possi[1]-col))&&
                (Math.abs(kingRow-row)==Math.abs(kingCol-col))&&
                (isBetween(col,kingCol,Number(possi[1])))&&
                (isBetween(row,kingRow,Number(possi[0])))){
            newSet.add(possi);
        }
        //vert/hori pin
        else if(!type&&(((possi[0]-row)==0&&kingRow==row&&(isBetween(col,kingCol,Number(possi[1]))))||
                ((possi[1]-col)==0)&&kingCol==col&&(isBetween(row,kingRow,Number(possi[0]))))){
            newSet.add(possi);
        }
    });
    game.possiList=newSet;
}
// Check if num3 is between num1 and num2 (inclusive)
function isBetween(num1, num2, num3) {
    return num3 >= Math.min(num1, num2) && num3 <= Math.max(num1, num2);
}

//Function to display possiList entries on board with circles
function displayPossi(){
    game.possiList.forEach(possi => {
        drawCircle(getSquarePosition(game.squareBoard[possi[0]][possi[1]]));
    });
}
//Function to update moveNote with last played move
function moveNotation(fromSquare,toSquare,special){
    if(special==1){ //short castle
        game.moveNote="O-O";
        return;
    }else if(special==2){ //long castle
        game.moveNote="O-O-O";
        return;
    }
    if(fromSquare.dataset.piece[1]!="P"){ //pawn not included in notation 
        game.moveNote+=fromSquare.dataset.piece[1];
    }
    if(toSquare.dataset.piece!="x"||special==3){//en passant
        if(fromSquare.dataset.piece[1]=="P"){
            game.moveNote+=square2Chess(fromSquare)[0];
        }
        game.moveNote+="x";
    }
    game.moveNote+=square2Chess(toSquare);
}

//Function to actually move the piece on the board
function movePiece(fromSquare, toSquare){
    game.moveNote="";

    let special=0;
    if(fromSquare.dataset.piece[1]=="R"){
        const squares=["00","07","70","77"];
        if(squares.includes(fromSquare.dataset.row+fromSquare.dataset.col)){
            game.rookMoved.add(fromSquare.dataset.row+fromSquare.dataset.col)
        }
    }
    if((fromSquare.dataset.piece=="wP"&&toSquare.dataset.row==0)||
            (fromSquare.dataset.piece=="bP"&&toSquare.dataset.row==7)){// promotion follows unique rules
        special=4;
        waitForPromotionSelection(toSquare,fromSquare);
        
    }
    if(fromSquare.dataset.piece[1]=="P"&&Math.abs(toSquare.dataset.row-fromSquare.dataset.row)==2){//en passant(able)
        game.enPassantable=[toSquare,2];
    }
    if(fromSquare.dataset.piece[1]=="P"&&toSquare.dataset.piece=="x"&&toSquare.dataset.col!=fromSquare.dataset.col){//did enpassant
        let num=Number(toSquare.dataset.row)+(2*Number(game.turn)-1);
        let passed=game.squareBoard[num][Number(toSquare.dataset.col)];
        passed.dataset.piece="x";
        passed.removeChild(passed.lastChild);
        special=3;
    }
    moveNotation(fromSquare,toSquare,special);


    toSquare.dataset.piece=fromSquare.dataset.piece;
    fromSquare.dataset.piece="x";
    if(toSquare.lastChild!=null){
        toSquare.removeChild(toSquare.lastChild);
    }
    toSquare.appendChild(fromSquare.lastChild);
    if(toSquare.dataset.piece=="wK"||toSquare.dataset.piece=="bK"){//castles
        let roto=(toSquare.dataset.piece[0]=="b");
        let rowType=Number(roto?0:7);
        game.kings[Number(roto)]=(toSquare.dataset.row+""+toSquare.dataset.col);
        game.kingMoved[Number(roto)]=true;
        if(fromSquare.dataset.col-toSquare.dataset.col==-2){//O-O
            fromSquare=game.squareBoard[rowType][7];
            toSquare=game.squareBoard[rowType][5];
            movePiece(fromSquare,toSquare);//move the rook
            special=1;
        }else if(fromSquare.dataset.col-toSquare.dataset.col==2){//O-O-O
            fromSquare=game.squareBoard[rowType][0];
            toSquare=game.squareBoard[rowType][3];
            movePiece(fromSquare,toSquare);//move the rook
            special=2;
        }
    }
    if(special==1||special==2){
        moveNotation(fromSquare,toSquare,special);
    }
    if(special!=4){checkOrMate(toSquare,fromSquare);}//look for check/checkmate
    return special; 

}
//Function to check if position is checkmate, check, or stalemate
//Also does disambiguating for notation
function checkOrMate(toSquare,fromSquare){ 

    let check=false;
    let dup=new Set();
    for(let i=0;i<=7;i++){
        for(let j=0;j<=7;j++){
            if(game.squareBoard[i][j].dataset.piece[0]==toSquare.dataset.piece[0] ){
                possibleMoves(game.squareBoard[i][j]);
                if(game.possiList.has(game.kings[Number(game.turn)])){
                    check=true;
                }
                
                let prev=toSquare.dataset.piece;
                toSquare.dataset.piece="x";
                possibleMoves(game.squareBoard[i][j]);
                //disambiguating possibility
                if(game.possiList.has(toSquare.dataset.row+""+toSquare.dataset.col)&&
                        prev==game.squareBoard[i][j].dataset.piece&&
                        prev[1]!="P"){
                    dup.add(game.squareBoard[i][j]);
                }
                toSquare.dataset.piece=prev;

            }
        }
    }
    let mate=true;
    game.turn=!game.turn;
    game.possiList.clear();
    let prevHigh=game.highlightedSquare;
    let color=game.squareBoard[Number(game.kings[Number(!game.turn)][0])][Number(game.kings[Number(!game.turn)][1])].dataset.piece[0];
    for(let i=0;i<=7;i++){
        for(let j=0;j<=7;j++){
            if(game.squareBoard[i][j].dataset.piece[0]==color ){
                game.highlightedSquare=game.squareBoard[i][j];
                possibleMoves(game.squareBoard[i][j]);
                if(game.possiList.size!=0){
                    mate=false;
                }
            }
        }
    }
    game.highlightedSquare=prevHigh;
    if(check&&mate){ //checkmate
        game.moveNote+="#";
        pgnBuilder.updateRes(Number(!game.turn));
        showPopup(0);
    }else if(check){ //check
        game.moveNote+="+";
    }else if(!check&&mate){ //stalemate
        pgnBuilder.updateRes(-1);
        showPopup(1);   
    }
    //need to disambiguate
    if(dup.size!=0&&game.moveNote[0]!="O"&&!game.moveNote.includes("=")){
        let pos=["",""];
        dup.forEach(thing => {
            if(thing.dataset.row==fromSquare.dataset.row){
                pos[0]=fromSquare.dataset.chess;
            }
            if(thing.dataset.col==fromSquare.dataset.col){
                pos[1]=fromSquare.dataset.chessC;
            }
        });
        if(pos[0]==""&&pos[1]==""){ //special case for knights
            pos[1]=game.highlightedSquare.dataset.chess;
        }

        game.moveNote=game.moveNote.slice(0,1)+pos[0]+pos[1]+game.moveNote.slice(1);
    }
    game.turn=!game.turn;
    
}
// Function to open the promotion overlay
function openPromotionOverlay(square) {
    return new Promise((resolve, reject) => {
    let squarePosition = getSquarePosition(square);
    let overlay=null;
    let overlayContent=null;
    const color=game.turn?"W":"B";
    const id=`promotionOverlay${color}`;
    overlay = document.getElementById(id);
    overlayContent = overlay.querySelector(".overlay-content");
    if(!game.flip&&game.turn||game.flip&&!game.turn){
        overlayContent.style.left = squarePosition.x + "px";
        overlayContent.style.top = squarePosition.y + "px";
    }else{
        setTimeout(() => {
            overlayContent.style.left = squarePosition.x + "px";
            overlayContent.style.top = squarePosition.y + squarePosition.height - overlayContent.clientHeight + "px";
        }, 0);
    }
    var closeButton = overlayContent.querySelector("#closeOverlayButton");
    if (closeButton) {
        closeButton.addEventListener("click", function() {
            closePromotionOverlay(processPromo);
            resolve(game.promoPiece); // Resolve the Promise with the selected piece
        });
    }
    overlay.style.display = "block";
    // Close overlay when clicking outside the content
    document.getElementById("promotionOverlayW").addEventListener("click", function(event) {
        if (event.target === this) {
            closePromotionOverlay(processPromo);
            resolve(game.promoPiece);
        }
        
    });
    document.getElementById("promotionOverlayB").addEventListener("click", function(event) {
        if (event.target === this) {
            closePromotionOverlay(processPromo);
            resolve(game.promoPiece);
        }
    });
    });
}

//Function that acts when the promotion selection is made
async function waitForPromotionSelection(toSquare,fromSquare) {
    let origin=toSquare.dataset.piece;
    let originA=toSquare.lastChild;
    let originF=fromSquare.dataset.piece;
    let url="";
    if(originA!=null){
        url = originA.getAttribute("style").match(/url\((['"]?)(.*?)\1\)/)[2];
    }
    await openPromotionOverlay(toSquare); // Wait until the overlay is closed
    if (game.promoPiece != null) {
        // update the moveNote
        game.moveNote=game.moveNote+"="+game.highlightedSquare.dataset.piece[1];
    } else {
        // No piece was selected
        //Reversing the last move
        toSquare.dataset.piece=origin;
        toSquare.removeChild(toSquare.lastChild);
        fromSquare.dataset.piece=originF;
        place(fromSquare,originF[0]+"Pawn.png");
        if(originA!=null){
            place(toSquare,url.substring(7));
        }
        game.turn=!game.turn;
        if(game.enPassantable!=null){
            game.enPassantable[1]++;
        }
        game.moveNote="";



    }
}

//Function to handle selected promotion piece
function processPromo(promoPiece){
    if(promoPiece==null){
        return false;
    }else{ //visually update promotion
        game.highlightedSquare.dataset.piece=promoPiece.substring(0,2);
        if(game.highlightedSquare.dataset.piece[1]=='K'){
            game.highlightedSquare.dataset.piece=game.highlightedSquare.dataset.piece[0]+"N";
        }
        game.moveNote+="="+game.highlightedSquare.dataset.piece[1];
        if(game.highlightedSquare.lastChild!=null){
            game.highlightedSquare.removeChild(game.highlightedSquare.lastChild);
        }
        place(game.highlightedSquare,promoPiece);
        game.turn=!game.turn;
        checkOrMate(game.highlightedSquare); //could lead to mate
        game.turn=!game.turn;

        updateSideLog(game.moveNote);
        if(pgnBuilder.result!=""){ //game over
            pgnBuilder.display();
        }
        return true;
    }
}
// Function to close the promotion overlay
function closePromotionOverlay(callback) {
    document.getElementById("promotionOverlayW").style.display = "none";
    document.getElementById("promotionOverlayB").style.display = "none";
    callback(game.promoPiece);

}


// Add click event listeners to promotion options
document.querySelectorAll(".promotion-option").forEach(function(option) {
    option.addEventListener("click", function() {
        game.promoPiece= option.getAttribute("src");
        game.promoPiece=game.promoPiece.substring(7);
        closePromotionOverlay(processPromo);
    });
});

let game=new Board();
let pgnBuilder=new pgnClass();
createBoard();

/** NEXT UP
 * AI?
 * proper draw?
 * update pin check?
 * could fix vocal promote?
 */
/** KNOWN BUGS
 * enpassant check
 */

//3 fold
//board flip
//sounds
//Vocal input
//modularity
