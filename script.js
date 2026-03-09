// javascript
import p5 from 'p5';
// import ml5 from 'ml5';

const sketch = (p) => {
	
	let raindrops = [];
	let gravity;
	let wind;
	
	let handPose;
	let video;
	let hands = [];

	let spawnX = 0;
	let spawnY = 0;
	let isPinching = false;
	
	class Raindrop {
		constructor() {
			// This code runs once when an instance is created.
			this.location = p.createVector(p.random(p.mouseX-10, p.mouseX+10), p.random(p.mouseY-10, p.mouseY+10));
			this.size = 5;
			this.velocity = p.createVector(p.random(-0.2, 0.2), p.random(-0.2, 0.2));
			this.age = 0;
			this.alive = true;
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
				// this.birth();
				this.alive = false;
			}
			this.age +=1;
			if (this.age > 240) {
				this.alive = false;
			}
		}
		
		// birth(){
		// 	this.location = p.createVector(p.random(p.mouseX-10, p.mouseX+10), p.random(p.mouseY-10, p.mouseY+10));
		// 	this.velocity = p.createVector(0, p.random(-0.2, 0.2));
		// 	this.age=0;
		// }
	}
	
	function modelLoaded() {
		console.log("Model loaded!");
	}
	
	function gotHands(results) {
		hands = results;
	}

	function getHandByLabel(label) {
		// ml5 handPose provides handedness as "Left" or "Right"
		// Note: the camera is mirrored, so ml5 may label them opposite.
		// You may need to swap "Left"/"Right" if it feels reversed.
		for (let hand of hands) {
			if (hand.handedness === label) return hand;
		}
		return null;
	}
	
	// p.preload = () => {
	// 	console.log("here")
	// }
	
	p.setup = async() => {
		p.createCanvas(p.windowWidth, p.windowHeight);
		handPose = ml5.handPose();
		video = p.createCapture(p.VIDEO);
		video.hide()
		video.size(p.width, p.height);
		// video.hide(); // Hide the extra video element
		
		handPose = await ml5.handPose(video, modelLoaded);
		await handPose.detectStart(video, gotHands);
		// Listen for new hand detection results
		// handPose.on("hand", gotHands);
		
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

		// Scale factors: video coords -> canvas coords
		let sx = p.width / video.width;
		let sy = p.height / video.height;

		let rightHand = getHandByLabel("Left");
		let leftHand = getHandByLabel("Right");

		// Check left hand pinch (thumb tip = 4, index tip = 8)
		isPinching = false;

		if (leftHand) {
			let thumbTip = leftHand.keypoints[4];
			let indexTip = leftHand.keypoints[8];
			let dx = (thumbTip.x - indexTip.x) * sx;
			let dy = (thumbTip.y - indexTip.y) * sy;
			let dist = Math.sqrt(dx * dx + dy * dy);
			isPinching = dist < 40; // threshold in pixels
		}

		// Get right hand index finger tip as spawn point
		if (rightHand) {
			let indexFinger = rightHand.keypoints[8];
			spawnX = indexFinger.x * sx;
			spawnY = indexFinger.y * sy;
			console.log(spawnX, spawnY);
		}

		// Spawn particles from right index finger when left hand pinches
		if (isPinching && rightHand) {
			for (let i = 0; i < 5; i++) { // spawn 5 per frame
				raindrops.push(new Raindrop(spawnX, spawnY));
			}
		}

		for (let i = 0; i < raindrops.length; i++) {
			raindrops[i].update();
			raindrops[i].show();
			if (!raindrops[i].alive) {
				raindrops.splice(i, 1);
			}
		}
		// p.image(video, 0, 0, p.width, p.height);

		for (let i = 0; i < hands.length; i++) {
			let hand = hands[i];
			for (let j = 0; j < hand.keypoints.length; j++) {
				let keypoint = hand.keypoints[j];
				p.fill(0,255,0);
				if (j === 4) p.fill(255, 0, 0);
				if(j === 8) p.fill(0,0,255);
				p.noStroke();
				p.circle(keypoint.x, keypoint.y, 10);
			}
		}
	};
	
	p.windowResized = () => {
		p.resizeCanvas(p.windowWidth, p.windowHeight);
	};
};

new p5(sketch, document.getElementById('sketch-container'));




