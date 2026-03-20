"use client";

export type RoomStage = {
  id: string;
  label: string;
  cells: (string | null)[];
};

export type Player = {
  id: string;
  name: string;
  color: string | null;
  isHost: boolean;
};

export type RoomState = {
  roomId: string;
  roomCode: string;
  hasPassword: boolean;
  selfPlayerId: string;
  stages: RoomStage[];
  players: Player[];
  updatedAt: string;
};

export type RoomGameState = {
  playerName: string;
  color: string | null;
  roomCodeInput: string;
  roomPassword: string;
  roomState: RoomState | null;
  statusText: string;
  errorText: string;
  toastMessage: string;
  inviteLink: string;
  lastActionText: string;
};

export type RoomGameAction =
  | { type: "set_player_name"; payload: string }
  | { type: "set_color"; payload: string | null }
  | { type: "set_room_code_input"; payload: string }
  | { type: "set_room_password"; payload: string }
  | { type: "set_error_text"; payload: string }
  | { type: "set_toast_message"; payload: string }
  | { type: "patch"; payload: Partial<RoomGameState> }
  | { type: "update_local_player_color"; payload: string }
  | {
      type: "update_local_cell";
      payload: {
        stageIndex: number;
        cellIndex: number;
        nextColor: string | null;
      };
    }
  | { type: "reset_local_board" }
  | { type: "leave_room" };

export const COLORS = ["#de7a00", "#45df00", "#2f6fe4", "#ffb8aa"];
export const DEFAULT_STAGE_COUNT = 10;
export const DEFAULT_CELL_COUNT = 4;

export const initialStages = Array.from({ length: DEFAULT_STAGE_COUNT }, (_, index) => ({
  id: `stage-${index + 1}`,
  label: `${DEFAULT_STAGE_COUNT - index}`,
  cells: Array.from({ length: DEFAULT_CELL_COUNT }, () => null as string | null)
}));

export const initialRoomGameState: RoomGameState = {
  playerName: "",
  color: null,
  roomCodeInput: "",
  roomPassword: "",
  roomState: null,
  statusText: "尚未連線",
  errorText: "",
  toastMessage: "",
  inviteLink: "",
  lastActionText: "等待下一個操作"
};

export function roomGameReducer(
  state: RoomGameState,
  action: RoomGameAction
): RoomGameState {
  switch (action.type) {
    case "set_player_name":
      return { ...state, playerName: action.payload };
    case "set_color":
      return { ...state, color: action.payload };
    case "set_room_code_input":
      return { ...state, roomCodeInput: action.payload };
    case "set_room_password":
      return { ...state, roomPassword: action.payload };
    case "set_error_text":
      return { ...state, errorText: action.payload };
    case "set_toast_message":
      return { ...state, toastMessage: action.payload };
    case "patch":
      return { ...state, ...action.payload };
    case "update_local_player_color":
      if (!state.roomState) {
        return state;
      }

      return {
        ...state,
        roomState: {
          ...state.roomState,
          players: state.roomState.players.map((player) =>
            player.id === state.roomState?.selfPlayerId
              ? { ...player, color: action.payload }
              : player
          )
        }
      };
    case "update_local_cell":
      if (!state.roomState) {
        return state;
      }

      return {
        ...state,
        roomState: {
          ...state.roomState,
          stages: state.roomState.stages.map((stage, currentStageIndex) => {
            if (currentStageIndex !== action.payload.stageIndex) {
              return stage;
            }

            return {
              ...stage,
              cells: stage.cells.map((cell, currentCellIndex) =>
                currentCellIndex === action.payload.cellIndex ? action.payload.nextColor : cell
              )
            };
          })
        }
      };
    case "reset_local_board":
      if (!state.roomState) {
        return state;
      }

      return {
        ...state,
        roomState: {
          ...state.roomState,
          stages: state.roomState.stages.map((stage) => ({
            ...stage,
            cells: stage.cells.map(() => null)
          }))
        }
      };
    case "leave_room":
      return {
        ...state,
        color: null,
        roomCodeInput: "",
        roomPassword: "",
        roomState: null,
        statusText: "尚未連線",
        errorText: "",
        toastMessage: "",
        inviteLink: "",
        lastActionText: "等待下一個操作"
      };
    default:
      return state;
  }
}
