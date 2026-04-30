import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

const _faqs = [
  {
    id: 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
    value: 'panel1',
    title: 'Questions 1',
    content:
      'Occaecati est et illo quibusdam accusamus qui. Incidunt aut et molestiae ut facere aut. Est quidem iusto praesentium excepturi harum nihil tenetur facilis. Ut omnis voluptates nihil accusantium doloribus eaque debitis.',
  },
  {
    id: 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b2',
    value: 'panel2',
    title: 'Questions 2',
    content:
      'Atque eaque ducimus minima distinctio velit. Laborum et veniam officiis. Delectus ex saepe hic id laboriosam officia. Odit nostrum qui illum saepe debitis ullam. Laudantium beatae modi fugit ut. Dolores consequatur beatae nihil voluptates rem maiores.',
  },
  {
    id: 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b3',
    value: 'panel3',
    title: 'Questions 3',
    content:
      'Rerum eius velit dolores. Explicabo ad nemo quibusdam. Voluptatem eum suscipit et ipsum et consequatur aperiam quia. Rerum nulla sequi recusandae illum velit quia quas. Et error laborum maiores cupiditate occaecati.',
  },
  {
    id: 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b4',
    value: 'panel4',
    title: 'Questions 4',
    content:
      'Et non omnis qui. Qui sunt deserunt dolorem aut velit cumque adipisci aut enim. Nihil quis quisquam nesciunt dicta nobis ab aperiam dolorem repellat. Voluptates non blanditiis. Error et tenetur iste soluta cupiditate ratione perspiciatis et. Quibusdam aliquid nam sunt et quisquam non esse.',
  },
  {
    id: 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b5',
    value: 'panel5',
    title: 'Questions 5',
    content:
      'Nihil ea sunt facilis praesentium atque. Ab animi alias sequi molestias aut velit ea. Sed possimus eos. Et est aliquid est voluptatem.',
  },
  {
    id: 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b6',
    value: 'panel6',
    title: 'Questions 6',
    content:
      'Non rerum modi. Accusamus voluptatem odit nihil in. Quidem et iusto numquam veniam culpa aperiam odio aut enim. Quae vel dolores. Pariatur est culpa veritatis aut dolorem.',
  },
  {
    id: 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b7',
    value: 'panel7',
    title: 'Questions 7',
    content:
      'Est enim et sit non impedit aperiam cumque animi. Aut eius impedit saepe blanditiis. Totam molestias magnam minima fugiat.',
  },
  {
    id: 'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b8',
    value: 'panel8',
    title: 'Questions 8',
    content:
      'Unde a inventore et. Sed esse ut. Atque ducimus quibusdam fuga quas id qui fuga.',
  },
];

// ----------------------------------------------------------------------

export function FaqList({ sx, ...other }: BoxProps) {
  return (
    <Box sx={sx} {...other}>
      {_faqs.map((item) => (
        <Accordion key={item.id}>
          <AccordionSummary
            id={`faqs-panel${item.id}-header`}
            aria-controls={`faqs-panel${item.id}-content`}
          >
            <Typography component="span" variant="subtitle1">
              {item.title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ color: 'text.secondary' }}>{item.content}</AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
