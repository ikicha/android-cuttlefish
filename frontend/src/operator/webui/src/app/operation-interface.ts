export interface ErrorInfo {
  error: string;
}

export interface OperationResult {
  error?: ErrorInfo;
}

export interface Operation {
  name: string;
  done: boolean;
  result?: OperationResult;
}
