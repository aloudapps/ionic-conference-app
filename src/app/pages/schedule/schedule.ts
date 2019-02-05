import { Component, ViewChild, OnInit, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonList, LoadingController, ModalController, ToastController } from '@ionic/angular';

import { ScheduleFilterPage } from '../schedule-filter/schedule-filter';
import { ConferenceData } from '../../providers/conference-data';
import { UserData } from '../../providers/user-data';
import { map } from 'rxjs/operators';
import { CalendarComponentOptions, DayConfig, CalendarComponent, CalendarComponentPayloadTypes, CalendarDay } from 'ion2-calendar';
import * as moment from 'moment';

@Component({
  selector: 'page-schedule',
  templateUrl: 'schedule.html',
  styleUrls: ['./schedule.scss'],
})
export class SchedulePage implements OnInit, AfterViewInit {
  // Gets a reference to the list element
  @ViewChild('scheduleList') scheduleList: IonList;
  @ViewChild('scheduleCalendar', {read: ElementRef}) calendar: ElementRef;

  queryText = '';
  segment = 'all';
  excludeTracks: any = [];
  shownSessions: any = [];
  groups: any = [];
  confDate: string;
  selectDate: string;
  daysConfig: DayConfig[] = [];
  calOptions: CalendarComponentOptions = {
    from: 1293683278, // the start unix timestamp
    daysConfig: this.daysConfig
  };
  constructor(
    public alertCtrl: AlertController,
    public confData: ConferenceData,
    public loadingCtrl: LoadingController,
    public modalCtrl: ModalController,
    public router: Router,
    public toastCtrl: ToastController,
    public user: UserData
  ) { }

  ngOnInit() {
    console.log(this.calendar);
    // this.app.setTitle('Schedule');
    this.findFirstSchedueDay();
  }

  ngAfterViewInit() {
    this.removeTodaySelection();
  }

  removeTodaySelection() {
    this.calendar.nativeElement.querySelectorAll('button').forEach((elem: any) => {
      if (elem.classList.contains('today')) {
        console.log(elem);
        elem.classList.remove('today');
      }
    });
  }

  findFirstSchedueDay() {
    this.daysConfig.push({
      date: moment('2019-02-05', 'YYYY-MM-DD').toDate(),
      marked: true,
      cssClass: 'plain'
    });
    this.confData.load().pipe().subscribe((data: any) => {
      this.selectDate = data.schedule[0].date;
      data.schedule.forEach((v: any) => {
        this.daysConfig.push({
          date: moment(v.date, 'YYYY-MM-DD').toDate(),
          marked: true
        });
      });
      this.updateSchedule();
    });
  }

  changeDay($event) {
    this.updateSchedule($event);
  }

  changeMonth() {
    console.log('aaaaaa');
    this.removeTodaySelection();
  }

  updateSchedule(date: string = this.selectDate) {
    // Close any open sliding items when the schedule updates
    if (this.scheduleList) {
      this.scheduleList.closeSlidingItems();
    }

    this.confData.getTimeline(date, this.queryText, this.excludeTracks, this.segment).subscribe((data: any) => {
      this.shownSessions = data.shownSessions;
      this.groups = data.groups;
    });
  }

  async presentFilter() {
    const modal = await this.modalCtrl.create({
      component: ScheduleFilterPage,
      componentProps: { excludedTracks: this.excludeTracks }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      this.excludeTracks = data;
      this.updateSchedule();
    }
  }

  async addFavorite(slidingItem: HTMLIonItemSlidingElement, sessionData: any) {
    if (this.user.hasFavorite(sessionData.name)) {
      // woops, they already favorited it! What shall we do!?
      // prompt them to remove it
      this.removeFavorite(slidingItem, sessionData, 'Favorite already added');
    } else {
      // remember this session as a user favorite
      this.user.addFavorite(sessionData.name);

      // create an alert instance
      const alert = await this.alertCtrl.create({
        header: 'Favorite Added',
        buttons: [{
          text: 'OK',
          handler: () => {
            // close the sliding item
            slidingItem.close();
          }
        }]
      });
      // now present the alert on top of all other content
      await alert.present();
    }

  }

  async removeFavorite(slidingItem: HTMLIonItemSlidingElement, sessionData: any, title: string) {
    const alert = await this.alertCtrl.create({
      header: title,
      message: 'Would you like to remove this session from your favorites?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            // they clicked the cancel button, do not remove the session
            // close the sliding item and hide the option buttons
            slidingItem.close();
          }
        },
        {
          text: 'Remove',
          handler: () => {
            // they want to remove this session from their favorites
            this.user.removeFavorite(sessionData.name);
            this.updateSchedule();

            // close the sliding item and hide the option buttons
            slidingItem.close();
          }
        }
      ]
    });
    // now present the alert on top of all other content
    await alert.present();
  }

  async openSocial(network: string, fab: HTMLIonFabElement) {
    const loading = await this.loadingCtrl.create({
      message: `Posting to ${network}`,
      duration: (Math.random() * 1000) + 500
    });
    await loading.present();
    await loading.onWillDismiss();
    fab.close();
  }
}
