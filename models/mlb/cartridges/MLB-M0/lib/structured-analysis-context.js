import {
  createStructuredAnalysisContextBuilder,
  sportVolatilityBase
} from '../../../../shared/sports-core/structured-analysis-context.js'
import { buildMlbAnalysisContext } from './mlb-analysis-context.js'

const buildStructuredAnalysisContext = createStructuredAnalysisContextBuilder({
  buildMlbAnalysisContext
})

export {
  buildStructuredAnalysisContext,
  sportVolatilityBase
}
