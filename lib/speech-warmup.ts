/**
 * "Unlock" the SpeechSynthesis engine on mobile browsers.
 *
 * Mobile browsers (iOS Safari, Chrome Android) block programmatic
 * speechSynthesis.speak() unless it was first called inside a direct
 * user-gesture call stack (click / tap). This function speaks a silent
 * utterance, which satisfies that requirement. Call it from a click
 * handler before navigating to a page that uses TTS.
 */
export function warmUpSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(' ');
  utterance.volume = 0;   // silent
  utterance.rate = 10;    // finish instantly
  window.speechSynthesis.speak(utterance);
}
