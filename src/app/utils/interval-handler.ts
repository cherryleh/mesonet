export class IntervalHandler {
  paused: boolean;
  executeOnStart: boolean;
  interval: number;
  intervalId: number | undefined;
  cb: () => void;

  constructor(interval: number, cb: () => void, deferExecution: boolean = true) {
    this.cb = cb;
    this.paused = true;
    this.interval = interval;
    this.executeOnStart = deferExecution;
  }

  start() {
    if (this.paused && this.intervalId === undefined) {
      if (this.executeOnStart) {
        this.cb();
      }
      this.executeOnStart = false;
      this.intervalId = window.setInterval(() => {
        if (this.paused) {
          clearInterval(this.intervalId);
          this.intervalId = undefined;
          this.executeOnStart = true;
        } else {
          this.cb();
        }
      }, this.interval);
    }
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }
}
