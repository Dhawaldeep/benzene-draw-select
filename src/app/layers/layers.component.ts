import { Component, Input, OnInit } from '@angular/core';
import { Layer } from '../interface/layer';

@Component({
  selector: 'app-layers',
  templateUrl: './layers.component.html',
  styleUrls: ['./layers.component.scss']
})
export class LayersComponent implements OnInit {
  @Input() layers!: Layer[]

  constructor() { }

  ngOnInit(): void {
  }

}
