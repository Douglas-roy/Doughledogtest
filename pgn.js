export default class pgnClass{
    constructor(){
        this.result="";
        this.game="";
        this.pgn= `[Event "Vocal Chess"]
        [Site "JacquesFish"]
        [Date "??"]
        [Round "?"]
        [White "Guest1"]
        [Black "Guest2"]
        `
    }
    updateGame(move) {
        this.game+=move;
    }
    updateRes(win){
        switch (win){
            case 1:
                this.result = "1-0";
                break;
            case 0:
                this.result ="0-1";
                break;
            default:
                this.result = "1/2-1/2";
                break;
        }
    }
    display(){
        this.pgn= this.pgn+
        `[Result "${this.result}"]

        ${this.game} ${this.result}`
        const blob = new Blob([this.pgn], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.download = 'game.pgn'; 
        downloadLink.href = url;
        downloadLink.style.marginLeft="30px";
        downloadLink.innerText = 'Download PGN';

        document.body.appendChild(downloadLink);
    }

}