/**
 * Remotion Root Configuration
 * Registers the startup animation composition
 */

import { Composition, registerRoot } from 'remotion';
import { StartupAnimation } from './StartupAnimation';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="StartupAnimation"
        component={StartupAnimation}
        durationInFrames={180}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};

registerRoot(RemotionRoot);
