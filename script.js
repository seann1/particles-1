// javascript
import p5 from 'p5';
import ml5 from 'ml5';

const sketch = (p) => {
	
	let raindrops = [];
	let gravity;
	let wind;
	
	let handPose;
	let video;
	let hands = [];
	
	class Raindrop {
		constructor() {
			// This code runs once when an instance is created.
			this.location = p.createVector(p.random(p.mouseX-10, p.mouseX+10), p.random(p.mouseY-10, p.mouseY+10));
			this.size = 5;
			this.velocity = p.createVector(p.random(-0.2, 0.2), p.random(-0.2, 0.2));
			this.age = 0;
			this.from = p.color(255,0,0);
			this.to = p.color(0,0,255);
		}
		
		show() {
			// This code runs once when .show() is called.
			let lerpAmount = p.map(this.age, 0 , 240, 0, 1);
			let ageSize = p.map(this.age, 0 , 240, 5, 20);
			let fillColor = p.lerpColor(this.from, this.to, lerpAmount);
			p.fill(fillColor)
			
			p.rect(this.location.x, this.location.y, ageSize, ageSize);
		}
		
		update() {
			
			// This code runs once when .update() is called.
			this.velocity.add(gravity);
			this.velocity.add(wind);
			this.location.add(this.velocity);
			if(this.location.y > p.height || this.location.y < 0 || this.location.x > p.width || this.location.x < 0){
				this.birth();
			}
			this.age +=1;
		}
		
		birth(){
			this.location = p.createVector(p.random(p.mouseX-10, p.mouseX+10), p.random(p.mouseY-10, p.mouseY+10));
			this.velocity = p.createVector(0, p.random(-0.2, 0.2));
			this.age=0;
		}
	}
	
	function modelLoaded() {
		console.log("Model loaded!");
	}
	
	function gotHands(results) {
		hands = results;
	}
	
	// p.preload = () => {
	// 	console.log("here")
	// }
	
	p.setup = async() => {
		p.createCanvas(p.windowWidth, p.windowHeight);
		handPose = ml5.handPose();
		video = p.createCapture(p.VIDEO);
		video.size(p.width, p.height);
		// video.hide(); // Hide the extra video element
		
		handPose = await ml5.handPose(video, modelLoaded);
		await handPose.detectStart(video, gotHands);
		// Listen for new hand detection results
		// handpose.on("hand", gotHands);
		
		for (let i = 0; i < 500; i++) {
			raindrops[i] = new Raindrop();
		}
		gravity = p.createVector(p.random(-0.02, 0.02), p.random(-0.02, 0.02));
		wind = p.createVector(0.05, 0);
	};
	
	p.draw = () => {
		let windXAmount = p.map(p.mouseX, 0, p.width, -0.05, 0.05);
		let windYAmount = p.map(p.mouseY, 0, p.height, -0.2, 0.2);
		wind.set(windXAmount, windYAmount);
		p.background(0);
		for (let i = 0; i < raindrops.length; i++) {
			raindrops[i].update();
			raindrops[i].show();
		}
		
		for (let i = 0; i < hands.length; i++) {
			let hand = hands[i];
			for (let j = 0; j < hand.keypoints.length; j++) {
				let keypoint = hand.keypoints[j];
				fill(0, 255, 0);
				noStroke();
				circle(keypoint.x, keypoint.y, 10);
			}
		}
	};
	
	p.windowResized = () => {
		p.resizeCanvas(p.windowWidth, p.windowHeight);
	};
};

new p5(sketch, document.getElementById('sketch-container'));




