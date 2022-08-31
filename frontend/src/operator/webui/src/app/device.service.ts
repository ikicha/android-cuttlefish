import {Injectable, SecurityContext} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Device} from './device-interface';
import {DeviceInfo} from './device-info-interface';
import {DomSanitizer} from '@angular/platform-browser';
import {
  catchError,
  filter,
  interval,
  map,
  mergeMap,
  of,
  Observable,
  ReplaySubject,
  Subject,
  takeWhile,
} from 'rxjs';

import {Operation} from './operation-interface';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private devicesSubject: Subject<Device[]> = new ReplaySubject<Device[]>(1);
  private devicesObservable = this.devicesSubject.asObservable();
  private operationTimedOutError: Operation = {
    name: '',
    done: true,
    result: {
      error: {
        error: 'Operation timed out',
      },
    },
  };

  constructor(
    private readonly httpClient: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  refresh(): void {
    this.httpClient
      .get<string[]>('./devices')
      .pipe(
        map((deviceIds: string[]) =>
          deviceIds.sort().map(this.createDevice.bind(this))
        )
      )
      .subscribe((devices: Device[]) => this.devicesSubject.next(devices));
  }

  deviceConnectURL(display: string): string {
    return this.sanitizer.sanitize(
      SecurityContext.RESOURCE_URL,
      this.sanitizer.bypassSecurityTrustResourceUrl(
        `/devices/${display}/files/client.html`
      )
    ) as string;
  }

  createDevice(deviceId: string): Device {
    return new Device(deviceId, this.deviceConnectURL(deviceId));
  }

  httpErrorHandler(err: HttpErrorResponse) {
    let errorMessage = '';

    if (err && err.error && err.error.message) {
      errorMessage = err.error.message;
    } else {
      errorMessage = err.message;
    }

    return of({
      name: '',
      done: true,
      result: {
        error: {
          error: 'HTTP Error: ' + errorMessage,
        },
      },
    });
  }

  requestNewDevice(
    buildId: string,
    target: string,
    instancesCount: number
  ): Observable<Operation> {
    const timeOut = 300;

    return this.httpClient
      .post<Operation>('./devices', {
        build_info: {build_id: buildId, target: target},
        instances_count: instancesCount,
      })
      .pipe(
        catchError(this.httpErrorHandler),
        mergeMap(operationInfo => {
          if (operationInfo.done) {
            return of(operationInfo);
          }

          return interval(1000).pipe(
            catchError(this.httpErrorHandler),
            mergeMap(currentTime => {
              if (currentTime >= timeOut) {
                return of(this.operationTimedOutError);
              }

              return this.httpClient.get<Operation>(
                './operations/' + operationInfo.name
              );
            })
          );
        }),
        takeWhile(operationInfo => !operationInfo.done, true),
        filter(operationInfo => operationInfo.done)
      );
  }

  getDevices() {
    this.refresh();
    return this.devicesObservable;
  }

  getDeviceInfo(deviceId: string) : Observable<DeviceInfo> {
    return this.httpClient
      .get('./devices/' + deviceId)
      .pipe(map(res => res as DeviceInfo));
  }
}
