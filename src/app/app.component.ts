import { AfterViewInit, Component, ElementRef, ViewChild } from "@angular/core";
import * as L from "leaflet";
import "leaflet-draw";
import * as turf from "@turf/turf";

import { environment } from "src/environments/environment";
import { Layer } from "./interface/layer";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements AfterViewInit {
  @ViewChild("mapEl")
  mapEl!: ElementRef<HTMLElement>;
  private map!: L.Map;
  private geoloaction: {
    lat: number;
    lng: number;
  } | undefined;
  private tileLayer!: L.TileLayer;
  private circle!: L.Circle;
  private benzeneVertexes: L.Marker[] = [];
  private icon = {
    icon: L.icon({
      iconSize: [25, 41],
      iconAnchor: [13, 0],
      // specify the path here
      iconUrl: "assets/marker-icon.png",
      shadowUrl: "assets/marker-shadow.png",
    }),
  };

  private drawControl!: L.Control.Draw;
  private drawItems!: L.FeatureGroup;
  layers: Layer[] = [];

  ngAfterViewInit() {
    navigator.geolocation.getCurrentPosition((pos) => {
      this.geoloaction = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      this.map.setView(this.geoloaction, 11);
      this.addBaseLayer();
      this.addCircle();
      this.addBenzene();
      this.addDrawControl();
    }, (err) => {
      this.addBaseLayer();
      this.addCircle();
      this.addBenzene();
      this.addDrawControl();
    });
    this.map = new L.Map(this.mapEl.nativeElement)
      .setView(
        [28.7041, 77.1025],
        11,
      );


  }

  private addBaseLayer() {
    this.tileLayer = L.tileLayer(
      `https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${environment.mapboxAccessToken}`,
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: "mapbox/streets-v11",
        tileSize: 512,
        zoomOffset: -1,
        accessToken: `${environment.mapboxAccessToken}`,
      },
    );
    this.tileLayer.addTo(this.map);
  }

  private addCircle() {
    const location = this.geoloaction || {
      lat: 28.7041,
      lng: 77.1025,
    };
    this.circle = L.circle(location, {
      color: "red",
      fillColor: "#f03",
      fillOpacity: 0.5,
      radius: 500,
    });
    this.circle.addTo(this.map).bindPopup('Center');
  }

  private addBenzene() {
    const location = this.geoloaction || {
      lat: 28.7041,
      lng: 77.1025,
    };
    const benzene = turf.circle([location.lng, location.lat], 10, {
      steps: 6,
    });
    L.geoJSON(benzene).setStyle({
      color: '#800080',
      fill: true,
      fillOpacity: 0.2
    }).addTo(this.map).bindPopup('Benzene Ring');
    this.benzeneVertexes = benzene.geometry.coordinates[0].slice(1).map(
      (coord) => {
        const position = {
          lat: +coord[1],
          lng: +coord[0],
        };
        return L.marker(position, this.icon);
      },
    );
    this.benzeneVertexes.forEach((v) => v.addTo(this.map).bindPopup('I am a Benzene Ring Vertex'));
    alert('Draw squares or polygons encompassing a benzene ring vertex');

  }

  private addDrawControl() {
    this.drawItems = new L.FeatureGroup();
    this.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.drawItems.addTo(this.map),
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        marker: false,
        circlemarker: false,
        polyline: false,
        circle: false,
      },
    });
    this.drawControl.addTo(this.map);

    this.map.on(L.Draw.Event.CREATED, (ev) => {
      this.drawItems.addLayer(ev.layer);
      const layerGeojson = ev.layer.toGeoJSON();
      const bool = this.benzeneVertexes.some((bv) => {
        return turf.booleanContains(layerGeojson, bv.toGeoJSON());
      });
      if (bool) {
        ev.layer.setStyle({
          color: "#ff0000",
        });
      }
      const layerName = prompt('Enter layer name');
      const id = this.drawItems.getLayerId(ev.layer);
      this.layers.push({
        id,
        name: layerName!,
        selected: bool,
      });
      ev.layer.bindPopup(`${layerName}`);
    });
    this.map.on(L.Draw.Event.EDITED, (ev) => {
      this.drawItems.getLayers().forEach((lay) => {
        const layerGeojson = (lay as any).toGeoJSON();
        const bool = this.benzeneVertexes.some((bv) => {
          return turf.booleanContains(layerGeojson, bv.toGeoJSON());
        });
        setTimeout(() => {
          (lay as any).setStyle({
            color: bool ? "#ff0000" : "#3388ff",
          });
        }, 1000);
        const id = this.drawItems.getLayerId(lay);
        this.layers.find(l => l.id === id)!.selected = bool;
      });
    });

    this.map.on(L.Draw.Event.DELETED, (ev) => {
      const layer = (ev as any).layers.getLayers()[0];
      const id = this.drawItems.getLayerId(layer);
      this.layers = this.layers.filter(lay => lay.id !== id);
    })

  }
}
