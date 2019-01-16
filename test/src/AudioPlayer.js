import React, { Component } from 'react';
import ReactHowler from 'react-howler';
import PropTypes from 'prop-types';

import { PlayButton, Timer } from 'react-soundplayer/components';
import ReactDOM from 'react-dom';

// import css to make the waveform responsive.
import './audio.css';

// import react-audio-waveform to show the waveform
import Waveform from 'react-audio-waveform';

// require the webaudio-peaks, which will be used to get the array data from the waveform
const extractPeaks = require('webaudio-peaks');

const DEFAULT_DURATION = 456.1495; // have to use this become modifying the audio file breaks 2x speed
const DEFAULT_MP3 =
  'https://parse-server-ff.s3.amazonaws.com/ae5992f0f5bb1f259bafa41b3771e3bb_call12565815456dwwwwww795896232www-01b59bd3.mp3';

class AudioPlayer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      playing: false,
      currentTime: 0,
      speedup: false,
      loadErr: false,
      peaks: [],
      canvasWidth: 0,
      comments: []
    };
    this.myRef = React.createRef();
  }

  seek(secs, play) {
    if (secs && secs.seek != null) secs = secs.seek();
    this.player.seek(secs);
    let toSet = { currentTime: secs };
    if (play == true) toSet.playing = true;
    this.setState(toSet);
  }

  toggleRate() {
    let { speedup } = this.state;
    speedup = !speedup;
    this.setState({ speedup });
    this.player._howler.rate(speedup ? 2.0 : 1.0);
  }

  getState() {
    let { playing, currentTime } = this.state;
    return { playing, currentTime };
  }

  getSeek() {
    if (this.playerInterval) clearInterval(this.playerInterval);
    this.playerInterval = setInterval(() => {
      let { mp3url } = this.props;
      if (this.player) {
        let currentTime = this.player.seek();
        const duration = mp3url == DEFAULT_MP3 ? DEFAULT_DURATION : this.player.duration();
        const toSet = { currentTime };
        if (!this.state.duration && duration != null) {
          toSet.duration = duration;
        }
        if (duration != null) toSet.loadErr = false;
        if (mp3url == DEFAULT_MP3 && currentTime >= DEFAULT_DURATION) {
          this.player.stop();
          toSet.playing = false;
          currentTime = 0;
        }
        this.setState(toSet);
      }
    }, 1000);
  }

  /**
   * This method returns the new size of the canvas which holds the waveform, 
   * so we can represent the comments adequately\
   * returns Void
   */
  resize() {
    const canvas = ReactDOM.findDOMNode(this.myRef.current).firstChild;
    const canvasWidth = canvas.width;
    this.setState({ canvasWidth });
  }
  componentWillUnmount() {
    if (this.playerInterval) clearTimeout(this.playerInterval);
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * This method converts the minuite of a comment to the width where it should be 
   * on the waveform
   * @param {Number} min the minuite which the message was left
   * @param {Number} duration The duration of the audio track
   */
  progressWidth(min, duration) {
    var percentageComplete = (min * 60) / duration;
    return this.state.canvasWidth * percentageComplete;
  }

  componentDidMount() {
    this.getSeek();
    this.getWaveform();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * This function creates an array of numbers from an audio to create a waveform
   * It uses the extractpeaks library alongside audiocontext to retrieve that.
   * returns Void
   */
  getWaveform() {
    // create an instance of the AudioContext
    const audioContext = new AudioContext();
    // fetch the guven url and return as a buffer
    fetch(this.props.mp3url)
      .then(response => response.arrayBuffer())
      .then(buffer => {
        // decode the audio data from the buffere
        audioContext.decodeAudioData(buffer, decodedData => {
          //calculate peaks from the decoded AudioBuffer
          var peaks = extractPeaks(decodedData, 10000, true);
          const comments = [{ comment: 'hi', time: 1.3 }, { comment: 'yo', time: 7.36, icon: '/pane/speedup.svg' }];
          console.log(peaks.data[0]);
          this.setState({ peaks: peaks.data[0], comments });
          const canvas = ReactDOM.findDOMNode(this.myRef.current).firstChild;
          const canvasWidth = canvas.width;
          this.setState({ canvasWidth });
        });
      });
  }

  isObject(obj) {
    return obj instanceof Object || (typeof obj === 'object' && obj !== null);
  }

  render() {
    const { mp3url } = this.props;
    let { playing, currentTime, duration, speedup, loadErr, peaks, comments } = this.state;
    if (this.isObject(currentTime)) currentTime = 0;
    if (mp3url == DEFAULT_MP3) duration = DEFAULT_DURATION;
    return (
      <div className="ff-audio">
        {duration != null ? (
          <div className="flex flex-center px2 relative z1">
            <PlayButton
              playing={playing}
              onTogglePlay={() => this.setState({ playing: !playing })}
              className="flex-none h2 mr2 button button-transparent button-grow rounded"
            />
            {/* seeking={Boolean}
                        seekingIcon={ReactElement} */}

            <div className="sb-soundplayer-volume mr2 flex flex-center">
              <button
                onClick={() => this.toggleRate()}
                className="sb-soundplayer-btn sb-soundplayer-volume-btn flex-none h2 button button-transparent button-grow rounded"
              >
                <img className={speedup ? 'audio-speedup' : ''} src="/pane/speedup.svg" height={35} />
              </button>
            </div>
            <div className="over">
              <span className="commentClass">
                {comments.map((object, i) => (
                  <span
                    style={{
                      left: this.progressWidth(object.time, duration),
                      width: '2px',
                      position: 'absolute',
                      backgroundColor: 'red',
                      top: 0,
                      bottom: 0,
                    }}
                    key={i}
                  >
                    <span
                      className="oneAndOnlyDiv"
                      style={{ textAlign: 'center', color: 'black', height: 'auto', minWidth: '120px' }}
                    >
                      {object.comment}
                    </span>
                  </span>
                ))}
              </span>
              <Waveform
                ref={this.myRef}
                barWidth={2}
                peaks={peaks}
                height={40}
                pos={currentTime || 0}
                duration={duration}
                onClick={ts => this.seek(ts)}
                color="#A9A9A9"
                progressColor="#fff"
              />
            </div>
            <Timer
              className={'timer'}
              duration={duration} // in seconds
              currentTime={currentTime != null ? currentTime : 0}
            />
          </div>
        ) : loadErr ? (
          <div style={{ padding: '5 20px' }}>Unable to load audio: {loadErr}</div>
        ) : (
          <div className="progress">
            <div className="indeterminate" />
          </div>
        )}
        <div>
          <ReactHowler
            src={mp3url}
            playing={playing}
            loop={false}
            onLoadError={(id, err) => {
              console.log('Unable to load media', err);
              this.setState({ loadErr: (err && err.message) || 'Startup error' });
            }}
            onLoad={() => this.getSeek()}
            ref={ref => (this.player = ref)}
          />
        </div>
      </div>
    );
  }
}

AudioPlayer.propTypes = {
  mp3url: PropTypes.string.isRequired,
};

export default AudioPlayer;
