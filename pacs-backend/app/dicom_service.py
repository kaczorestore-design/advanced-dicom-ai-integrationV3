from pynetdicom import AE, evt, build_context
from pynetdicom.sop_class import StudyRootQueryRetrieveInformationModelFind
from pynetdicom.sop_class import StudyRootQueryRetrieveInformationModelMove
from pynetdicom.sop_class import StudyRootQueryRetrieveInformationModelGet
from pydicom import Dataset
import logging
from typing import List, Dict, Any
import os

logger = logging.getLogger(__name__)


class DicomNodeConnector:
    """DICOM networking service for C-FIND, C-MOVE, C-GET operations"""

    def __init__(self, ae_title: str = "PACS_SYSTEM", port: int = 11112):
        self.ae_title = ae_title
        self.port = port
        self.ae = AE(ae_title=ae_title)

        self.ae.add_supported_context(StudyRootQueryRetrieveInformationModelFind)
        self.ae.add_supported_context(StudyRootQueryRetrieveInformationModelMove)
        self.ae.add_supported_context(StudyRootQueryRetrieveInformationModelGet)

    def c_find(
        self, remote_ae: Dict[str, Any], query_dataset: Dataset
    ) -> List[Dataset]:
        """Perform C-FIND operation"""
        results = []

        def handle_find(event):
            if event.status.Status == 0xFF00:
                results.append(event.identifier)
            return 0x0000

        handlers = [(evt.EVT_C_FIND, handle_find)]

        assoc = self.ae.associate(
            remote_ae["address"],
            remote_ae["port"],
            ae_title=remote_ae["ae_title"],
            evt_handlers=handlers,
        )

        if assoc.is_established:
            status = assoc.send_c_find(
                query_dataset, StudyRootQueryRetrieveInformationModelFind
            )
            assoc.release()

        return results

    def c_move(
        self, remote_ae: Dict[str, Any], query_dataset: Dataset, move_destination: str
    ) -> bool:
        """Perform C-MOVE operation"""
        success = False

        def handle_move(event):
            nonlocal success
            if event.status.Status == 0x0000:
                success = True
            return 0x0000

        handlers = [(evt.EVT_C_MOVE, handle_move)]

        assoc = self.ae.associate(
            remote_ae["address"],
            remote_ae["port"],
            ae_title=remote_ae["ae_title"],
            evt_handlers=handlers,
        )

        if assoc.is_established:
            status = assoc.send_c_move(
                query_dataset,
                move_destination,
                StudyRootQueryRetrieveInformationModelMove,
            )
            assoc.release()

        return success

    def start_scp_server(self):
        """Start DICOM SCP server"""
        self.ae.start_server(("", self.port), block=False)
        logger.info(f"DICOM SCP server started on port {self.port}")
