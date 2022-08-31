import {Component, HostListener, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import {DeviceService} from '../device.service';

@Component({
  selector: 'app-create-device-dialog',
  templateUrl: './create-device-dialog.component.html',
  styleUrls: ['./create-device-dialog.component.sass'],
})
export class CreateDeviceDialogComponent {
  errorMessage: string | null = null;
  inProgress: boolean = false;
  buildId: string = '8980391';
  targetName: string = 'aosp_cf_x86_64_phone-userdebug';
  instancesCount: number = 1;

  constructor(
    private deviceService: DeviceService,
    public dialogRef: MatDialogRef<CreateDeviceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string
  ) {}

  ngOnInit(): void {}

  onClickedCreate(): void {
    this.errorMessage = null;
    this.inProgress = true;

    this.deviceService
      .requestNewDevice(this.buildId, this.targetName, this.instancesCount)
      .subscribe(res => {
        this.inProgress = false;
        if (res.result && res.result.error) {
          this.errorMessage = res.result.error.error;
        } else {
          this.dialogRef.close();
        }
      });
  }

  @HostListener('window:keyup.Escape', ['$event'])
  onEscapeKey() {
    this.dialogRef.close();
  }
}
