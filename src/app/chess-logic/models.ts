import { Piece } from "./pieces/piece";

export enum Color {
    White,
    Black
}

export type Coords = {
    x: number;
    y: number;
}

export enum FENChar {
    WhitePawn = "P",
    WhiteKnight = "N",
    WhiteBishop = "B",
    WhiteRook = "R",
    WhiteQueen = "Q",
    WhiteKing = "K",
    BlackPawn = "p",
    BlackKnight = "n",
    BlackBishop = "b",
    BlackRook = "r",
    BlackQueen = "q",
    BlackKing = "k"
}

export const pieceImagePaths: { [key in FENChar]: string } = {
    [FENChar.WhitePawn]: "assets/pieces2/white-pawn.png",
    [FENChar.WhiteKnight]: "assets/pieces2/white-knight.png",
    [FENChar.WhiteBishop]: "assets/pieces2/white-bishop.png",
    [FENChar.WhiteRook]: "assets/pieces2/white-rook.png",
    [FENChar.WhiteQueen]: "assets/pieces2/white-queen.png",
    [FENChar.WhiteKing]: "assets/pieces2/white-king.png",
    [FENChar.BlackPawn]: "assets/pieces2/black-pawn.png",
    [FENChar.BlackKnight]: "assets/pieces2/black-knight.png",
    [FENChar.BlackBishop]: "assets/pieces2/black-bishop.png",
    [FENChar.BlackRook]: "assets/pieces2/black-rook.png",
    [FENChar.BlackQueen]: "assets/pieces2/black-queen.png",
    [FENChar.BlackKing]: "assets/pieces2/black-king.png"
};

export type SafeSquares = Map<string, Coords[]>;

export enum MoveType {
    Capture,
    Castling,
    Promotion,
    Check,
    CheckMate,
    BasicMove
}

export type LastMove = {
    piece: Piece;
    prevX: number;
    prevY: number;
    currX: number;
    currY: number;
    moveType: Set<MoveType>;
}

type KingChecked = {
    isInCheck: true;
    x: number;
    y: number;
}

type KingNotChecked = {
    isInCheck: false;
}

export type CheckState = KingChecked | KingNotChecked;

export type MoveList = ([string, string?])[];

export type GameHistory = {
    lastMove: LastMove | undefined;
    checkState: CheckState;
    board: (FENChar | null)[][];
}[];